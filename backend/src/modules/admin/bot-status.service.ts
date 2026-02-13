import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { JobEntity } from '../job/job.schema';
import { BotStatusEntity } from './bot-status.schema';

export interface BotStatus {
  friendCode: string;
  available: boolean;
  lastReportedAt: string;
  friendCount: number | null;
}

/**
 * Bot 状态管理服务
 * 存储 Worker 上报的 Bot 可用性信息（MongoDB），并定期清理分配给不可用 Bot 的任务
 */
@Injectable()
export class BotStatusService implements OnModuleDestroy {
  private readonly logger = new Logger(BotStatusService.name);

  /** 定期清理不可用 Bot 任务的定时器 */
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  /** 清理间隔 (ms) - 5 分钟 */
  private static readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

  /** Bot 上报超时阈值 (ms) - 5 分钟未上报视为不可用 */
  private static readonly REPORT_TIMEOUT_MS = 5 * 60 * 1000;

  constructor(
    @InjectModel(JobEntity.name)
    private readonly jobModel: Model<JobEntity>,
    @InjectModel(BotStatusEntity.name)
    private readonly botStatusModel: Model<BotStatusEntity>,
  ) {
    this.startCleanup();
  }

  onModuleDestroy() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * Worker 上报 Bot 状态
   */
  async report(
    bots: { friendCode: string; available: boolean; friendCount?: number }[],
  ): Promise<void> {
    const now = new Date();
    const ops = bots.map((bot) => ({
      updateOne: {
        filter: { friendCode: bot.friendCode },
        update: {
          $set: {
            available: bot.available,
            lastReportedAt: now,
            friendCount: bot.friendCount ?? null,
          },
        },
        upsert: true,
      },
    }));

    await this.botStatusModel.bulkWrite(ops);

    this.logger.log(
      `Bot status reported: ${bots.length} bots (${bots.filter((b) => b.available).length} available)`,
    );
  }

  /**
   * 获取所有 Bot 的状态
   */
  async getAll(): Promise<BotStatus[]> {
    const now = Date.now();
    const docs = await this.botStatusModel.find().lean().exec();

    return docs.map((doc) => {
      const timeSinceReport = now - new Date(doc.lastReportedAt).getTime();
      const timedOut = timeSinceReport > BotStatusService.REPORT_TIMEOUT_MS;

      return {
        friendCode: doc.friendCode,
        available: timedOut ? false : doc.available,
        lastReportedAt: new Date(doc.lastReportedAt).toISOString(),
        friendCount: doc.friendCount,
      };
    });
  }

  /**
   * 获取指定 bot 的好友数量
   */
  async getFriendCount(friendCode: string): Promise<number | null> {
    const doc = await this.botStatusModel.findOne({ friendCode }).lean().exec();
    return doc?.friendCount ?? null;
  }

  /**
   * 启动定期清理定时器
   */
  private startCleanup(): void {
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupStaleJobs().catch((err) => {
        this.logger.error('Failed to cleanup stale bot jobs', err);
      });
    }, BotStatusService.CLEANUP_INTERVAL_MS);
    this.logger.log(
      `Stale bot job cleanup started (interval: ${BotStatusService.CLEANUP_INTERVAL_MS}ms)`,
    );
  }

  /**
   * 清理分配给不可用 Bot 的任务
   * 将 queued/processing 且分配给 5 分钟内未上报可用的 Bot 的任务标记为 failed
   */
  private async cleanupStaleJobs(): Promise<void> {
    const now = Date.now();
    const threshold = new Date(now - BotStatusService.REPORT_TIMEOUT_MS);

    // 从 DB 查询不可用的 bot
    const unavailableDocs = await this.botStatusModel
      .find({
        $or: [{ available: false }, { lastReportedAt: { $lt: threshold } }],
      })
      .lean()
      .exec();

    const unavailableBots = unavailableDocs.map((d) => d.friendCode);

    if (!unavailableBots.length) {
      return;
    }

    const result = await this.jobModel.updateMany(
      {
        botUserFriendCode: { $in: unavailableBots },
        status: { $in: ['queued', 'processing'] },
      },
      {
        $set: {
          status: 'failed',
          executing: false,
          error: 'Bot Cookie 已过期或不可用',
          updatedAt: new Date(),
        },
      },
    );

    if (result.modifiedCount > 0) {
      this.logger.warn(
        `Cleaned up ${result.modifiedCount} jobs assigned to unavailable bots: ${unavailableBots.join(', ')}`,
      );
    }
  }
}
