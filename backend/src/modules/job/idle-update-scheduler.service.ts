import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobService } from './job.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class IdleUpdateSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(IdleUpdateSchedulerService.name);
  private intervalId: NodeJS.Timeout | null = null;

  /** UTC+8 小时数，默认 0 点 */
  private readonly idleUpdateHour: number;
  /** 并发度（每次调度创建多少个 job） */
  private readonly concurrency: number;

  constructor(
    private readonly jobService: JobService,
    private readonly usersService: UsersService,
    config: ConfigService,
  ) {
    this.idleUpdateHour = Number(config.get<string>('IDLE_UPDATE_HOUR', '0'));
    this.concurrency = Number(
      config.get<string>('IDLE_UPDATE_CONCURRENCY', '5'),
    );
  }

  onModuleInit() {
    // 每分钟检查一次是否到了闲时更新时间
    this.intervalId = setInterval(() => {
      this.checkAndTrigger().catch((err) => {
        this.logger.error('Idle update scheduler error', err);
      });
    }, 60 * 1000);

    this.logger.log(
      `Idle update scheduler started (hour=${this.idleUpdateHour} UTC+8, concurrency=${this.concurrency})`,
    );
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private lastTriggeredDate: string | null = null;

  private async checkAndTrigger(): Promise<void> {
    // 获取 UTC+8 时间
    const now = new Date();
    const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const hour = utc8.getUTCHours();
    const dateKey = utc8.toISOString().slice(0, 10);

    // 只在目标小时且当天未触发过时执行
    if (hour !== this.idleUpdateHour || this.lastTriggeredDate === dateKey) {
      return;
    }

    this.lastTriggeredDate = dateKey;
    this.logger.log(`Triggering idle update jobs for ${dateKey}`);

    const users = await this.usersService.getIdleUpdateUsers();
    if (!users.length) {
      this.logger.log('No users with idle update enabled');
      return;
    }

    let created = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await this.jobService.create({
          friendCode: user.friendCode,
          skipUpdateScore: false,
          jobType: 'idle_update_score',
        });

        // 清除用户的闲时更新标记
        const userId = String(user._id);
        await this.usersService.update(userId, {
          idleUpdateBotFriendCode: null,
        });

        created++;
      } catch (err) {
        failed++;
        this.logger.warn(
          `Failed to create idle update job for ${user.friendCode}: ${err}`,
        );
      }

      // 控制并发度 - 每批 concurrency 个后等待一下
      if (created % this.concurrency === 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    this.logger.log(
      `Idle update complete: ${created} jobs created, ${failed} failed out of ${users.length} users`,
    );
  }
}
