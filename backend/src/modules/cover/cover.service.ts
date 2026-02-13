import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { MusicEntity } from '../music/music.schema';
import type { MusicDocument } from '../music/music.schema';
import { MusicService } from '../music/music.service';
import type { MusicDataSource } from '../music/music.service';
import {
  buildDivingFishDocs,
  buildLxnsDocs,
  buildIdMap,
} from '../../common/prober/id-map';
import { getLxnsSongListUrl } from '../../common/prober/lxns/transform';
import type { LxnsApiResponse } from '../../common/prober/lxns/transform';

type SyncSummary = {
  total: number;
  saved: number;
  skipped: number;
  failed: number;
};

const DIVING_FISH_MUSIC_URL =
  'https://www.diving-fish.com/api/maimaidxprober/music_data';

@Injectable()
export class CoverService {
  private readonly logger = new Logger(CoverService.name);
  private readonly divingFishCoverBase = 'https://www.diving-fish.com/covers';
  private readonly lxnsCoverBase = 'https://assets.lxns.net/maimai/jacket';
  private readonly baseDir = join(process.cwd(), 'covers');

  constructor(
    @InjectModel(MusicEntity.name)
    private readonly musicModel: Model<MusicDocument>,
    private readonly musicService: MusicService,
  ) {}

  private padId(id: string) {
    return id.length < 5 ? id.padStart(5, '0') : id;
  }

  private buildLocalPath(id: string) {
    const padded = this.padId(id);
    return join(this.baseDir, `${padded}.png`);
  }

  /** diving-fish cover URL: 5-digit zero-padded id */
  private buildDivingFishUrl(divingFishId: string) {
    const padded = this.padId(divingFishId);
    return `${this.divingFishCoverBase}/${padded}.png`;
  }

  /** lxns cover URL: raw numeric song id */
  private buildLxnsUrl(lxnsId: string) {
    return `${this.lxnsCoverBase}/${lxnsId}.png!webp`;
  }

  async getLocalPathIfExists(id: string) {
    const path = this.buildLocalPath(id);
    try {
      await stat(path);
      return path;
    } catch {
      return null;
    }
  }

  async getCoverCount(): Promise<number> {
    try {
      const files = await readdir(this.baseDir);
      return files.filter((f) => f.endsWith('.png')).length;
    } catch {
      return 0;
    }
  }

  private async ensureDir() {
    await mkdir(this.baseDir, { recursive: true });
  }

  // ---------------------------------------------------------------------------
  // Build the cross-source ID mapping
  // ---------------------------------------------------------------------------

  private async buildCrossIdMap(dataSource: MusicDataSource): Promise<{
    toDivingFishId: (dbId: string) => string | null;
    toLxnsId: (dbId: string) => string | null;
  }> {
    this.logger.log('Fetching both sources to build ID mapping...');

    const [dfRaw, lxnsRaw] = await Promise.all([
      fetch(DIVING_FISH_MUSIC_URL).then(async (r) => {
        if (!r.ok) throw new Error(`diving-fish responded ${r.status}`);
        return r.json() as Promise<any[]>;
      }),
      fetch(getLxnsSongListUrl()).then(async (r) => {
        if (!r.ok) throw new Error(`lxns responded ${r.status}`);
        return r.json() as Promise<LxnsApiResponse>;
      }),
    ]);

    const dfDocs = buildDivingFishDocs(dfRaw);
    const lxDocs = buildLxnsDocs(lxnsRaw);
    const { dfToLxns, lxnsToDf } = buildIdMap(dfDocs, lxDocs);

    this.logger.log(
      `ID mapping built: ${dfToLxns.size} diving-fish↔lxns pairs`,
    );

    if (dataSource === 'diving-fish') {
      return {
        toDivingFishId: (dbId) => dbId, // already diving-fish
        toLxnsId: (dbId) => dfToLxns.get(dbId) ?? null,
      };
    } else {
      return {
        toDivingFishId: (dbId) => lxnsToDf.get(dbId) ?? null,
        toLxnsId: (dbId) => dbId, // already lxns
      };
    }
  }

  // ---------------------------------------------------------------------------
  // syncAll
  // ---------------------------------------------------------------------------

  async syncAll(): Promise<SyncSummary> {
    return this.doSync(false);
  }

  async forceSyncAll(): Promise<SyncSummary> {
    return this.doSync(true);
  }

  private async doSync(force: boolean): Promise<SyncSummary> {
    const dataSource = await this.musicService.getDataSource();
    this.logger.log(`Current data source: ${dataSource}, force=${force}`);

    const musics = await this.musicModel.find().select({ id: 1 }).lean();
    const summary: SyncSummary = {
      total: musics.length,
      saved: 0,
      skipped: 0,
      failed: 0,
    };

    await this.ensureDir();

    const { toDivingFishId, toLxnsId } = await this.buildCrossIdMap(dataSource);

    let processed = 0;
    const tasks = musics.map((m) => async () => {
      const dbId = String(m.id);
      const localPath = this.buildLocalPath(dbId);
      const exists = await this.getLocalPathIfExists(dbId);

      if (exists && !force) {
        summary.skipped += 1;
      } else {
        const saved = await this.fetchAndSaveCover(
          dbId,
          localPath,
          toDivingFishId,
          toLxnsId,
        );
        if (saved) {
          summary.saved += 1;
        } else {
          summary.failed += 1;
        }
      }

      processed += 1;
      if (processed % 50 === 0 || processed === summary.total) {
        this.logger.log(
          `Cover sync progress: ${processed}/${summary.total} (saved=${summary.saved}, skipped=${summary.skipped}, failed=${summary.failed})`,
        );
      }
    });

    await runWithConcurrency(tasks, 16);

    return summary;
  }

  /**
   * 1. 先尝试 diving-fish 封面 (用 diving-fish id)
   * 2. 如果 404，尝试 lxns 封面 (用 lxns id)
   * 返回是否保存成功
   */
  private async fetchAndSaveCover(
    dbId: string,
    localPath: string,
    toDivingFishId: (dbId: string) => string | null,
    toLxnsId: (dbId: string) => string | null,
  ): Promise<boolean> {
    // --- 1. Try diving-fish ---
    const dfId = toDivingFishId(dbId);
    if (dfId) {
      const url = this.buildDivingFishUrl(dfId);
      try {
        const res = await fetch(url);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          await writeFile(localPath, buf);
          return true;
        }
      } catch {
        // fall through
      }
    }

    // --- 2. Fallback: lxns ---
    const lxId = toLxnsId(dbId);
    if (lxId) {
      const url = this.buildLxnsUrl(lxId);
      try {
        const res = await fetch(url);
        const cacheControl = res.headers.get('cache-control');
        if (res.ok && cacheControl !== 'no-cache') {
          const buf = Buffer.from(await res.arrayBuffer());
          await writeFile(localPath, buf);
          return true;
        }
      } catch {
        // fall through
      }
    }

    this.logger.warn(
      `Cover not found for dbId=${dbId} (dfId=${dfId ?? '?'}, lxId=${lxId ?? '?'})`,
    );
    return false;
  }
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let next = 0;

  const workers = new Array(Math.min(limit, tasks.length))
    .fill(null)
    .map(async () => {
      while (next < tasks.length) {
        const idx = next++;
        results[idx] = await tasks[idx]();
      }
    });

  await Promise.all(workers);
  return results;
}
