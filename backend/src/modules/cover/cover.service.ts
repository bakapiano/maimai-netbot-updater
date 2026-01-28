import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { MusicEntity } from '../music/music.schema';
import type { MusicDocument } from '../music/music.schema';

type SyncSummary = {
  total: number;
  saved: number;
  skipped: number;
  failed: number;
};

@Injectable()
export class CoverService {
  private readonly logger = new Logger(CoverService.name);
  private readonly baseUrl = 'https://www.diving-fish.com/covers';
  private readonly baseDir = join(process.cwd(), 'covers');

  constructor(
    @InjectModel(MusicEntity.name)
    private readonly musicModel: Model<MusicDocument>,
  ) {}

  private padId(id: string) {
    return id.length < 5 ? id.padStart(5, '0') : id;
  }

  private buildRemoteUrl(id: string) {
    const padded = this.padId(id);
    return `${this.baseUrl}/${padded}.png`;
  }

  private buildLocalPath(id: string) {
    const padded = this.padId(id);
    return join(this.baseDir, `${padded}.png`);
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

  async syncAll(): Promise<SyncSummary> {
    const musics = await this.musicModel.find().select({ id: 1 }).lean();
    const summary: SyncSummary = {
      total: musics.length,
      saved: 0,
      skipped: 0,
      failed: 0,
    };

    await this.ensureDir();

    let processed = 0;
    const tasks = musics.map((m) => async () => {
      const id = String(m.id);
      const localPath = this.buildLocalPath(id);
      const exists = await this.getLocalPathIfExists(id);
      if (exists) {
        summary.skipped += 1;
      } else {
        const url = this.buildRemoteUrl(id);
        try {
          const res = await fetch(url);
          if (!res.ok) {
            // 第一层 fallback: 如果是 1xxxx 格式，尝试 10xxx -> 00xxx
            if (id.startsWith('1') && id.length === 5) {
              const fallbackId1 = '00' + id.substring(2);
              const fallbackUrl1 = this.buildRemoteUrl(fallbackId1);
              this.logger.log(`Trying fallback for ${id} -> ${fallbackId1}`);

              try {
                const fallbackRes1 = await fetch(fallbackUrl1);
                if (fallbackRes1.ok) {
                  const buf = Buffer.from(await fallbackRes1.arrayBuffer());
                  await writeFile(localPath, buf);
                  summary.saved += 1;
                  return;
                }
              } catch (fallbackError1) {
                this.logger.warn(`First fallback failed for ${fallbackId1}`);
              }
            }

            // 第二层 fallback: lxns.net (五位数去掉第一位并去掉前导0，否则直接用原ID)
            const songId =
              id.length === 5 ? String(parseInt(id.substring(1))) : id;
            const fallbackUrl2 = `https://assets.lxns.net/maimai/jacket/${songId}.png!webp`;
            this.logger.log(
              `Trying second fallback for ${id} -> songId ${songId}`,
            );

            try {
              const fallbackRes2 = await fetch(fallbackUrl2);
              const cacheControl = fallbackRes2.headers.get('cache-control');
              if (fallbackRes2.ok && cacheControl !== 'no-cache') {
                const buf = Buffer.from(await fallbackRes2.arrayBuffer());
                await writeFile(localPath, buf);
                summary.saved += 1;
                return;
              } else if (cacheControl === 'no-cache') {
                this.logger.warn(
                  `Second fallback returned 404 (no-cache) for songId ${songId}`,
                );
              }
            } catch (fallbackError2) {
              this.logger.warn(
                `Second fallback also failed for songId ${songId}`,
              );
            }

            summary.failed += 1;
            this.logger.warn(
              `Cover fetch failed for ${id}: HTTP ${res.status}`,
            );
          } else {
            const buf = Buffer.from(await res.arrayBuffer());
            await writeFile(localPath, buf);
            summary.saved += 1;
          }
        } catch (e) {
          summary.failed += 1;
          this.logger.error(`Cover fetch error for ${id}: ${e}`);
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
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
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
