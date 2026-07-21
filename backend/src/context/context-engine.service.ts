import { Injectable } from '@nestjs/common';
import { TaskSection, TaskStatus } from '@prisma/client';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { BriefingService } from '../briefing/briefing.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { MembershipService } from '../membership/membership.service';
import { WorkspaceService } from '../workspace/workspace.service';
import type { WorkspaceContextPayload } from './workspace-context.types';

const EMAIL_LIMIT = 8;
const MEETING_LIMIT = 8;
const TASK_LIMIT = 12;
const DEADLINE_LIMIT = 8;
const SNIPPET_MAX = 180;

function clip(value: string | null | undefined, max = SNIPPET_MAX): string {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Context Engine — builds a structured, size-capped workspace snapshot for the model.
 * Reads synced DB rows + Home brief; never forwards an entire mailbox.
 */
@Injectable()
export class ContextEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly briefing: BriefingService,
    private readonly membership: MembershipService,
    private readonly workspaces: WorkspaceService,
  ) {}

  async buildForUser(
    user: AuthUser,
    workspaceId?: string,
  ): Promise<{ workspaceId: string; context: WorkspaceContextPayload }> {
    const wsId = workspaceId?.trim()
      ? workspaceId.trim()
      : (await this.workspaces.ensureDefaultWorkspace(user)).id;
    await this.membership.requireMembership(user.id, wsId);

    const now = new Date();
    const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const emailSince = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    const [brief, meetings, emails, tasks] = await Promise.all([
      this.briefing.getHomeBrief(user, wsId),
      this.prisma.calendarEvent.findMany({
        where: {
          workspaceId: wsId,
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
          workspaceId: wsId,
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
          workspaceId: wsId,
          status: { not: TaskStatus.done },
          section: { in: [TaskSection.today, TaskSection.upcoming, TaskSection.waiting] },
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
    ]);

    const priorities = brief.focus.slice(0, 5).map((item) => ({
      id: item.id,
      title: item.title,
      reason: item.reason,
      priority: item.priority,
      urgencyLabel: item.urgencyLabel,
      estimatedTime: item.estimatedTime,
      platform: item.platform,
    }));

    const deadlines = [
      ...tasks
        .filter((task) => task.dueAt != null || Boolean(task.dueLabel?.trim()))
        .slice(0, DEADLINE_LIMIT)
        .map((task) => ({
          id: task.id,
          title: task.title,
          dueAt: task.dueAt?.toISOString(),
          dueLabel: task.dueLabel ?? undefined,
          priority: task.priority,
        })),
      ...brief.focus
        .filter((item) => /deadline|due|submit/i.test(`${item.urgencyLabel} ${item.title}`))
        .slice(0, 4)
        .map((item) => ({
          id: item.id,
          title: item.title,
          dueLabel: item.estimatedTime,
          priority: item.priority,
        })),
    ].slice(0, DEADLINE_LIMIT);

    const context: WorkspaceContextPayload = {
      brief: clip(
        `${brief.successLabel}. ${brief.successInsight}`,
        280,
      ),
      priorities,
      meetings: meetings.map((event) => ({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
        location: event.location ? clip(event.location, 80) : undefined,
      })),
      deadlines,
      recentEmails: emails.map((email) => ({
        id: email.id,
        subject: clip(email.subject, 120) || '(no subject)',
        from: clip(email.fromName || email.fromAddress, 80) || undefined,
        snippet: clip(email.snippet, SNIPPET_MAX),
        receivedAt: email.receivedAt?.toISOString(),
        isUnread: email.isUnread,
      })),
      // Provider sync for these lands later — keep slots stable for the prompt contract.
      github: [],
      slack: [],
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        section: task.section,
        priority: task.priority,
        dueLabel: task.dueLabel ?? undefined,
        estimatedTime: task.estimatedTime ?? undefined,
      })),
    };

    return { workspaceId: wsId, context };
  }
}
