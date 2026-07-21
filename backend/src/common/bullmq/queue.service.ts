import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { JobsOptions, Queue } from 'bullmq';
import {
  Queues,
  ScheduledJobs,
  type AnalyticsJobName,
  type BriefingJobName,
  type NotificationJobName,
  type SyncJobName,
} from '../constants/queues';
import { DEFAULT_JOB_OPTIONS } from './job-options';

export type SyncAccountJobData = {
  workspaceId: string;
  connectedAccountId: string;
  resource?: 'calendar' | 'email' | 'contacts' | 'tasks' | 'messages';
  reason?:
    | 'manual'
    | 'schedule'
    | 'webhook'
    | 'onboarding'
    | 'recovery'
    | 'historical';
  historical?: boolean;
  lookbackDays?: number;
  lookaheadDays?: number;
};

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(Queues.SYNC) private readonly syncQueue: Queue,
    @InjectQueue(Queues.BRIEFING) private readonly briefingQueue: Queue,
    @InjectQueue(Queues.ANALYTICS) private readonly analyticsQueue: Queue,
    @InjectQueue(Queues.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
    @InjectQueue(Queues.AI) private readonly aiQueue: Queue,
    @InjectQueue(Queues.ACTIONS) private readonly actionsQueue: Queue,
  ) {}

  async enqueueSync(
    name: SyncJobName,
    data: SyncAccountJobData,
    opts?: JobsOptions,
  ) {
    return this.syncQueue.add(name, data, {
      ...DEFAULT_JOB_OPTIONS,
      ...opts,
    });
  }

  async enqueueBriefing(
    name: BriefingJobName,
    data: Record<string, unknown>,
    opts?: JobsOptions,
  ) {
    return this.briefingQueue.add(name, data, {
      ...DEFAULT_JOB_OPTIONS,
      ...opts,
    });
  }

  async enqueueAnalytics(
    name: AnalyticsJobName,
    data: Record<string, unknown>,
    opts?: JobsOptions,
  ) {
    return this.analyticsQueue.add(name, data, {
      ...DEFAULT_JOB_OPTIONS,
      ...opts,
    });
  }

  async enqueueNotification(
    name: NotificationJobName,
    data: Record<string, unknown>,
    opts?: JobsOptions,
  ) {
    return this.notificationsQueue.add(name, data, {
      ...DEFAULT_JOB_OPTIONS,
      ...opts,
    });
  }

  /**
   * Registers cron/repeatable jobs once (idempotent by jobId).
   * Call from the worker process only.
   */
  async ensureScheduledJobs(): Promise<void> {
    // Drop any prior cadence (e.g. */15) so only the 30-minute job remains.
    const repeatables = await this.syncQueue.getRepeatableJobs();
    for (const job of repeatables) {
      if (
        job.name === 'sync.due-accounts' ||
        job.id === ScheduledJobs.SYNC_DUE_ACCOUNTS
      ) {
        await this.syncQueue.removeRepeatableByKey(job.key);
      }
    }

    await this.syncQueue.add(
      'sync.due-accounts' satisfies SyncJobName,
      { reason: 'schedule' },
      {
        ...DEFAULT_JOB_OPTIONS,
        jobId: ScheduledJobs.SYNC_DUE_ACCOUNTS,
        repeat: { pattern: '*/30 * * * *' },
      },
    );

    await this.briefingQueue.add(
      'briefing.morning' satisfies BriefingJobName,
      {},
      {
        ...DEFAULT_JOB_OPTIONS,
        jobId: ScheduledJobs.BRIEFING_MORNING,
        // 6:00 America/New_York weekdays — workers interpret in UTC; refine later per-user TZ.
        repeat: { pattern: '0 11 * * 1-5' },
      },
    );

    await this.analyticsQueue.add(
      'analytics.daily' satisfies AnalyticsJobName,
      {},
      {
        ...DEFAULT_JOB_OPTIONS,
        jobId: ScheduledJobs.ANALYTICS_DAILY,
        repeat: { pattern: '0 7 * * *' },
      },
    );

    await this.notificationsQueue.add(
      'notifications.digest' satisfies NotificationJobName,
      {},
      {
        ...DEFAULT_JOB_OPTIONS,
        jobId: ScheduledJobs.NOTIFICATIONS_DIGEST,
        repeat: { pattern: '0 18 * * 1-5' },
      },
    );

    this.logger.log('Repeatable BullMQ schedules ensured');
  }

  /** Exposed for health / diagnostics. */
  getQueues(): Queue[] {
    return [
      this.syncQueue,
      this.briefingQueue,
      this.analyticsQueue,
      this.notificationsQueue,
      this.aiQueue,
      this.actionsQueue,
    ];
  }
}
