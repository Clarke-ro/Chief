import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { Queues } from '../../common/constants/queues';
import { NotificationsService } from '../../notifications/notifications.service';

type NotificationDispatchData = {
  workspaceId?: string;
  userId?: string;
};

@Processor(Queues.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notifications: NotificationsService) {
    super();
  }

  async process(job: Job<NotificationDispatchData>): Promise<void> {
    this.logger.log(
      { jobId: job.id, name: job.name },
      'Notifications job started',
    );

    if (job.name === 'notifications.digest') {
      const result = await this.notifications.runDigest();
      this.logger.log(result, 'Notifications digest finished');
      return;
    }

    if (job.name === 'notifications.dispatch') {
      const workspaceId = job.data.workspaceId?.trim();
      const userId = job.data.userId?.trim();
      if (!workspaceId || !userId) {
        throw new Error('notifications.dispatch requires workspaceId and userId');
      }
      const result = await this.notifications.dispatchFromBrief({
        workspaceId,
        userId,
      });
      this.logger.log(result, 'Notifications dispatch finished');
      return;
    }

    this.logger.warn({ name: job.name }, 'Unhandled notifications job name');
  }
}
