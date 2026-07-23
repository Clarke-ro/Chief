import { Injectable, Logger } from '@nestjs/common';
import { IntegrationProvider, TaskSection, TaskStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import type { WorkspaceKnowledge } from './knowledge.types';

const EMAIL_LIMIT = 8;
const MEETING_LIMIT = 8;
const TASK_LIMIT = 12;
const GITHUB_LIMIT = 8;
const SLACK_LIMIT = 8;
const SNIPPET_MAX = 180;

export function clipKnowledge(
  value: string | null | undefined,
  max = SNIPPET_MAX,
): string {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Knowledge Engine — projects synced DB rows into structured, clipped knowledge.
 * Does not call the LLM.
 */
@Injectable()
export class KnowledgeEngineService {
  private readonly logger = new Logger(KnowledgeEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async loadSnapshot(workspaceId: string): Promise<WorkspaceKnowledge> {
    const now = new Date();
    const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const emailSince = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    const [meetings, emails, tasks, githubTasks, slackMessages] =
      await Promise.all([
        this.prisma.calendarEvent.findMany({
          where: {
            workspaceId,
            startsAt: { gte: now, lte: horizon },
          },
          orderBy: { startsAt: 'asc' },
          take: MEETING_LIMIT,
          select: {
            id: true,
            title: true,
            startsAt: true,
            endsAt: true,
            location: true,
          },
        }),
        this.prisma.email.findMany({
          where: {
            workspaceId,
            OR: [
              { receivedAt: { gte: emailSince } },
              { receivedAt: null, syncedAt: { gte: emailSince } },
            ],
          },
          orderBy: [{ isUnread: 'desc' }, { receivedAt: 'desc' }],
          take: EMAIL_LIMIT,
          select: {
            id: true,
            subject: true,
            fromName: true,
            fromAddress: true,
            snippet: true,
            receivedAt: true,
            isUnread: true,
          },
        }),
        this.prisma.task.findMany({
          where: {
            workspaceId,
            status: { not: TaskStatus.done },
            section: {
              in: [TaskSection.today, TaskSection.upcoming, TaskSection.waiting],
            },
          },
          orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }],
          take: TASK_LIMIT,
          select: {
            id: true,
            title: true,
            status: true,
            section: true,
            priority: true,
            dueAt: true,
            dueLabel: true,
            estimatedTime: true,
          },
        }),
        this.prisma.task.findMany({
          where: {
            workspaceId,
            provider: IntegrationProvider.github,
            status: { not: TaskStatus.done },
          },
          orderBy: [{ updatedAt: 'desc' }],
          take: GITHUB_LIMIT,
          select: {
            id: true,
            title: true,
            description: true,
          },
        }),
        this.loadSlackMessages(workspaceId, emailSince),
      ]);

    return {
      workspaceId,
      asOf: now.toISOString(),
      meetings: meetings.map((event) => ({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
        location: event.location
          ? clipKnowledge(event.location, 80)
          : undefined,
      })),
      recentEmails: emails.map((email) => ({
        id: email.id,
        subject: clipKnowledge(email.subject, 120) || '(no subject)',
        from:
          clipKnowledge(email.fromName || email.fromAddress, 80) || undefined,
        snippet: clipKnowledge(email.snippet, SNIPPET_MAX),
        receivedAt: email.receivedAt?.toISOString(),
        isUnread: email.isUnread,
      })),
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        section: task.section,
        priority: task.priority,
        dueAt: task.dueAt?.toISOString(),
        dueLabel: task.dueLabel ?? undefined,
        estimatedTime: task.estimatedTime ?? undefined,
      })),
      github: githubTasks.map((task) => ({
        id: task.id,
        title: task.title,
        summary: clipKnowledge(task.description, SNIPPET_MAX) || undefined,
      })),
      slack: slackMessages.map((msg) => ({
        id: msg.id,
        title: msg.channelName
          ? `#${msg.channelName}${msg.authorName ? ` · ${msg.authorName}` : ''}`
          : msg.authorName || 'Slack',
        summary: clipKnowledge(msg.text, SNIPPET_MAX) || undefined,
      })),
    };
  }

  private async loadSlackMessages(
    workspaceId: string,
    since: Date,
  ): Promise<
    Array<{
      id: string;
      text: string | null;
      channelName: string | null;
      authorName: string | null;
    }>
  > {
    try {
      return await this.prisma.providerMessage.findMany({
        where: {
          workspaceId,
          provider: IntegrationProvider.slack,
          OR: [
            { sentAt: { gte: since } },
            { sentAt: null, syncedAt: { gte: since } },
          ],
        },
        orderBy: [{ sentAt: 'desc' }],
        take: SLACK_LIMIT,
        select: {
          id: true,
          text: true,
          channelName: true,
          authorName: true,
        },
      });
    } catch (error) {
      this.logger.warn(
        {
          err: error instanceof Error ? error.message : String(error),
          workspaceId,
        },
        'provider_message unavailable — knowledge continuing without Slack',
      );
      return [];
    }
  }
}
