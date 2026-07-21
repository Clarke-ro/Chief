import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { BriefingService } from '../../briefing/briefing.service';
import { QueueService } from '../../common/bullmq/queue.service';
import { Queues } from '../../common/constants/queues';
import { PrismaService } from '../../common/prisma/prisma.service';

type BriefingGenerateData = {
  workspaceId?: string;
  userId?: string;
  reason?: string;
};

@Processor(Queues.BRIEFING)
export class BriefingProcessor extends WorkerHost {
  private readonly logger = new Logger(BriefingProcessor.name);

  constructor(
    private readonly briefing: BriefingService,
    private readonly queues: QueueService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<BriefingGenerateData>): Promise<void> {
    this.logger.log({ jobId: job.id, name: job.name }, 'Briefing job started');

    if (job.name === 'briefing.morning') {
      const { enqueued } = await this.briefing.enqueueMorningFanout(
        async (workspaceId, userId) => {
          try {
            await this.queues.enqueueBriefing(
              'briefing.generate',
              { workspaceId, userId, reason: 'morning' },
              { jobId: `brief-morning-${workspaceId}-${utcDateKey()}` },
            );
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            if (!/already exists|Job.*exist/i.test(message)) throw error;
          }
        },
      );
      this.logger.log({ enqueued }, 'Morning briefing fan-out complete');
      return;
    }

    if (job.name === 'briefing.generate') {
      const workspaceId = job.data.workspaceId?.trim();
      if (!workspaceId) {
        throw new Error('briefing.generate requires workspaceId');
      }

      const userId =
        job.data.userId?.trim() ||
        (await this.firstMemberUserId(workspaceId));

      const brief = await this.briefing.generateForWorkspace(
        workspaceId,
        userId ?? undefined,
      );
      if (!brief || !userId) return;

      try {
        await this.queues.enqueueNotification(
          'notifications.dispatch',
          { workspaceId, userId },
          {
            jobId: `notify-dispatch-${workspaceId}-${halfHourBucket()}`,
          },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/already exists|Job.*exist/i.test(message)) {
          throw error;
        }
      }

      this.logger.log(
        {
          workspaceId,
          focus: brief.focus.length,
          briefing: brief.briefing.length,
        },
        'Briefing generate finished',
      );
      return;
    }

    this.logger.warn({ name: job.name }, 'Unhandled briefing job name');
  }

  private async firstMemberUserId(workspaceId: string): Promise<string | null> {
    const membership = await this.prisma.membership.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    });
    return membership?.userId ?? null;
  }
}

function utcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function halfHourBucket(date = new Date()): string {
  return String(Math.floor(date.getTime() / (30 * 60 * 1000)));
}
