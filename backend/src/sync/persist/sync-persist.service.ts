import { Injectable, Logger } from '@nestjs/common';
import { SyncResource, type Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizeGoogleCalendarEvent } from '../normalize/calendar-normalizer';
import { normalizeGmailMessage } from '../normalize/gmail-normalizer';
import { normalizeGoogleTask } from '../normalize/tasks-normalizer';
import type { RawSyncBatch } from '../sync.types';

/**
 * Persists fetched provider batches into Prisma tables the Home brief reads.
 * Lean path — no classification / knowledge-engine extras.
 */
@Injectable()
export class SyncPersistService {
  private readonly logger = new Logger(SyncPersistService.name);

  constructor(private readonly prisma: PrismaService) {}

  async accept(batch: RawSyncBatch): Promise<{
    accepted: boolean;
    itemCount: number;
    persisted: number;
    stub: boolean;
  }> {
    if (batch.stub) {
      return {
        accepted: true,
        itemCount: batch.items.length,
        persisted: 0,
        stub: true,
      };
    }

    let persisted = 0;
    switch (batch.resource) {
      case SyncResource.email:
        persisted = await this.persistEmails(batch);
        break;
      case SyncResource.calendar:
        persisted = await this.persistCalendar(batch);
        break;
      case SyncResource.tasks:
        persisted = await this.persistTasks(batch);
        break;
      default:
        this.logger.debug(
          { resource: batch.resource },
          'No persist handler for resource yet',
        );
    }

    if (persisted > 0) {
      // Drop today's cached brief so GET /workspace/brief recomposes.
      const briefDate = utcDateOnly();
      await this.prisma.brief.deleteMany({
        where: { workspaceId: batch.workspaceId, briefDate },
      });
    }

    this.logger.log(
      {
        workspaceId: batch.workspaceId,
        resource: batch.resource,
        itemCount: batch.items.length,
        persisted,
      },
      'Sync batch persisted',
    );

    return {
      accepted: true,
      itemCount: batch.items.length,
      persisted,
      stub: false,
    };
  }

  private async persistEmails(batch: RawSyncBatch): Promise<number> {
    let count = 0;
    for (const item of batch.items) {
      const normalized = normalizeGmailMessage(item.payload);
      if (!normalized) continue;
      const now = new Date();
      await this.prisma.email.upsert({
        where: {
          connectedAccountId_providerMessageId: {
            connectedAccountId: batch.connectedAccountId,
            providerMessageId: normalized.providerMessageId,
          },
        },
        create: {
          workspaceId: batch.workspaceId,
          connectedAccountId: batch.connectedAccountId,
          provider: batch.provider,
          providerMessageId: normalized.providerMessageId,
          threadId: normalized.threadId,
          subject: normalized.subject,
          snippet: normalized.snippet,
          bodyText: normalized.bodyText,
          bodyHtml: normalized.bodyHtml,
          fromAddress: normalized.fromAddress,
          fromName: normalized.fromName,
          toAddresses: normalized.toAddresses,
          ccAddresses: normalized.ccAddresses,
          labelIds: normalized.labelIds,
          isUnread: normalized.isUnread,
          isStarred: normalized.isStarred,
          receivedAt: normalized.receivedAt,
          raw: normalized.raw as Prisma.InputJsonValue,
          syncedAt: now,
        },
        update: {
          threadId: normalized.threadId,
          subject: normalized.subject,
          snippet: normalized.snippet,
          bodyText: normalized.bodyText,
          bodyHtml: normalized.bodyHtml,
          fromAddress: normalized.fromAddress,
          fromName: normalized.fromName,
          toAddresses: normalized.toAddresses,
          ccAddresses: normalized.ccAddresses,
          labelIds: normalized.labelIds,
          isUnread: normalized.isUnread,
          isStarred: normalized.isStarred,
          receivedAt: normalized.receivedAt,
          raw: normalized.raw as Prisma.InputJsonValue,
          syncedAt: now,
        },
      });
      count += 1;
    }
    return count;
  }

  private async persistCalendar(batch: RawSyncBatch): Promise<number> {
    let count = 0;
    for (const item of batch.items) {
      const normalized = normalizeGoogleCalendarEvent(item.payload);
      if (!normalized) continue;

      // Cancelled events: remove local copy.
      if (normalized.status === 'cancelled') {
        await this.prisma.calendarEvent.deleteMany({
          where: {
            connectedAccountId: batch.connectedAccountId,
            providerEventId: normalized.providerEventId,
          },
        });
        continue;
      }

      const now = new Date();
      await this.prisma.calendarEvent.upsert({
        where: {
          connectedAccountId_providerEventId: {
            connectedAccountId: batch.connectedAccountId,
            providerEventId: normalized.providerEventId,
          },
        },
        create: {
          workspaceId: batch.workspaceId,
          connectedAccountId: batch.connectedAccountId,
          provider: batch.provider,
          providerEventId: normalized.providerEventId,
          title: normalized.title,
          description: normalized.description,
          location: normalized.location,
          status: normalized.status,
          startsAt: normalized.startsAt,
          endsAt: normalized.endsAt,
          allDay: normalized.allDay,
          timezone: normalized.timezone,
          attendees: normalized.attendees as Prisma.InputJsonValue,
          htmlLink: normalized.htmlLink,
          raw: normalized.raw as Prisma.InputJsonValue,
          syncedAt: now,
        },
        update: {
          title: normalized.title,
          description: normalized.description,
          location: normalized.location,
          status: normalized.status,
          startsAt: normalized.startsAt,
          endsAt: normalized.endsAt,
          allDay: normalized.allDay,
          timezone: normalized.timezone,
          attendees: normalized.attendees as Prisma.InputJsonValue,
          htmlLink: normalized.htmlLink,
          raw: normalized.raw as Prisma.InputJsonValue,
          syncedAt: now,
        },
      });
      count += 1;
    }
    return count;
  }

  private async persistTasks(batch: RawSyncBatch): Promise<number> {
    let count = 0;
    for (const item of batch.items) {
      const normalized = normalizeGoogleTask(item.payload, item.providerItemId);
      if (!normalized) continue;
      if (!batch.connectedAccountId) continue;

      const now = new Date();
      await this.prisma.task.upsert({
        where: {
          connectedAccountId_providerTaskId: {
            connectedAccountId: batch.connectedAccountId,
            providerTaskId: normalized.providerTaskId,
          },
        },
        create: {
          workspaceId: batch.workspaceId,
          connectedAccountId: batch.connectedAccountId,
          provider: batch.provider,
          providerTaskId: normalized.providerTaskId,
          title: normalized.title,
          description: normalized.description,
          details: normalized.details,
          platform: normalized.platform,
          priority: normalized.priority,
          status: normalized.status,
          section: normalized.section,
          estimatedTime: normalized.estimatedTime,
          confidence: normalized.confidence,
          dueAt: normalized.dueAt,
          dueLabel: normalized.dueLabel,
          completedAt: normalized.completedAt,
          meta: normalized.meta as Prisma.InputJsonValue,
        },
        update: {
          title: normalized.title,
          description: normalized.description,
          details: normalized.details,
          platform: normalized.platform,
          priority: normalized.priority,
          status: normalized.status,
          section: normalized.section,
          estimatedTime: normalized.estimatedTime,
          confidence: normalized.confidence,
          dueAt: normalized.dueAt,
          dueLabel: normalized.dueLabel,
          completedAt: normalized.completedAt,
          meta: normalized.meta as Prisma.InputJsonValue,
          updatedAt: now,
        },
      });
      count += 1;
    }
    return count;
  }
}

function utcDateOnly(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
