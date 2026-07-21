import { Injectable } from '@nestjs/common';
import {
  IntegrationProvider,
  TaskPriority,
  TaskSection,
  TaskStatus,
  type Prisma,
} from '@prisma/client';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { MembershipService } from '../membership/membership.service';
import { WorkspaceService } from '../workspace/workspace.service';
import {
  type BriefingSignalDto,
  type FocusItemDto,
  type HomeBriefDto,
  isHomeBriefDto,
} from './briefing.types';

const PLATFORMS = new Set([
  'gmail',
  'calendar',
  'slack',
  'github',
  'notion',
  'asana',
  'trello',
]);

@Injectable()
export class BriefingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly workspaces: WorkspaceService,
  ) {}

  async getHomeBrief(user: AuthUser, workspaceId?: string): Promise<HomeBriefDto> {
    const wsId = await this.resolveWorkspaceId(user, workspaceId);
    await this.membership.requireMembership(user.id, wsId);

    const briefDate = utcDateOnly();
    const existing = await this.prisma.brief.findUnique({
      where: {
        workspaceId_briefDate: { workspaceId: wsId, briefDate },
      },
    });

    // Never serve a fresh-but-empty cache — sync may have landed after first paint.
    if (
      existing &&
      isFresh(existing.generatedAt) &&
      isHomeBriefDto(existing.payload) &&
      hasBriefContent(existing.payload)
    ) {
      return {
        ...existing.payload,
        userName: firstName(user.name) || existing.payload.userName,
      };
    }

    const composed = await this.composeBrief(user, wsId);
    await this.prisma.brief.upsert({
      where: {
        workspaceId_briefDate: { workspaceId: wsId, briefDate },
      },
      create: {
        workspaceId: wsId,
        userId: user.id,
        briefDate,
        userName: composed.userName,
        successScore: composed.successScore,
        successLabel: composed.successLabel,
        successInsight: composed.successInsight,
        payload: composed as unknown as Prisma.InputJsonValue,
      },
      update: {
        userId: user.id,
        userName: composed.userName,
        successScore: composed.successScore,
        successLabel: composed.successLabel,
        successInsight: composed.successInsight,
        payload: composed as unknown as Prisma.InputJsonValue,
        generatedAt: new Date(),
      },
    });

    return composed;
  }

  private async composeBrief(user: AuthUser, workspaceId: string): Promise<HomeBriefDto> {
    const now = new Date();
    const calendarFrom = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const calendarTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [tasks, unreadEmails, recentEmails, events] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          workspaceId,
          section: TaskSection.today,
          status: { not: TaskStatus.done },
        },
        orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
        take: 12,
      }),
      this.prisma.email.findMany({
        where: {
          workspaceId,
          isUnread: true,
        },
        orderBy: { receivedAt: 'desc' },
        take: 8,
      }),
      this.prisma.email.findMany({
        where: { workspaceId },
        orderBy: { receivedAt: 'desc' },
        take: 8,
      }),
      this.prisma.calendarEvent.findMany({
        where: {
          workspaceId,
          startsAt: { gte: calendarFrom, lt: calendarTo },
          NOT: { status: 'cancelled' },
        },
        orderBy: { startsAt: 'asc' },
        take: 8,
      }),
    ]);

    // Prefer unread; fall back to newest synced mail (many inboxes have 0 UNREAD).
    const emails = unreadEmails.length > 0 ? unreadEmails : recentEmails;

    // Prisma enum order is high/medium/low — reorder so high comes first.
    const priorityRank: Record<TaskPriority, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };
    tasks.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);

    let focus: FocusItemDto[] = tasks.map((task) => this.taskToFocus(task));
    // Until task sync exists, surface top mail as focus so Home isn't blank.
    if (focus.length === 0 && emails.length > 0) {
      focus = emails.slice(0, 5).map((email, index) => this.emailToFocus(email, index));
    }

    const briefing: BriefingSignalDto[] = [
      ...emails.map((email) => this.emailToSignal(email)),
      ...events.map((event) => this.eventToSignal(event)),
    ].slice(0, 12);

    const openCount = focus.length;
    const signalCount = briefing.length;
    const successScore =
      openCount === 0 && signalCount === 0
        ? 0.42
        : Math.max(0.35, Math.min(0.92, 0.88 - openCount * 0.04));

    let successLabel = 'On track';
    if (openCount === 0 && signalCount === 0) successLabel = 'Getting started';
    else if (openCount > 5) successLabel = 'Packed';
    else if (openCount === 0) successLabel = 'Clear focus';

    let successInsight =
      'Clear your top focus items early and the rest of the day opens up.';
    if (openCount === 0 && signalCount === 0) {
      successInsight =
        'Connect Google and pull to refresh — sync needs mail or calendar before the brief fills.';
    } else if (tasks.length === 0 && emails.length > 0) {
      successInsight = unreadEmails.length
        ? 'Unread mail is queued as today’s priorities until task sync lands.'
        : 'Recent mail is queued as today’s priorities until task sync lands.';
    } else if (openCount === 0) {
      successInsight = 'No open focus items — scan briefing signals for anything urgent.';
    } else if (openCount <= 3) {
      successInsight = `Clear ${openCount} focus item${openCount === 1 ? '' : 's'} to stay ahead today.`;
    }

    return {
      userName: firstName(user.name) || 'there',
      successScore,
      successLabel,
      successInsight,
      focus,
      briefing,
    };
  }

  private taskToFocus(task: {
    id: string;
    title: string;
    description: string;
    details: string;
    platform: string;
    provider: IntegrationProvider | null;
    priority: TaskPriority;
    estimatedTime: string | null;
    estimatedMinutes: number | null;
    confidence: number | null;
  }): FocusItemDto {
    const platform = mapPlatform(task.platform, task.provider, 'notion');
    const estimatedTime =
      task.estimatedTime?.trim() ||
      (task.estimatedMinutes != null ? `${task.estimatedMinutes} min` : '10 min');
    const reason =
      task.description.trim() ||
      (task.priority === TaskPriority.high
        ? 'High priority on today’s list.'
        : 'On your today list.');

    return {
      id: task.id,
      platform,
      title: task.title,
      reason,
      estimatedTime,
      priority: task.priority,
      confidence: clamp01(task.confidence ?? 0.72),
      actions: [
        { id: `${task.id}-ask`, label: 'Ask Chief', tone: 'accent' },
        { id: `${task.id}-open`, label: 'Open' },
      ],
      urgencyLabel:
        task.priority === TaskPriority.high
          ? 'High priority'
          : task.priority === TaskPriority.medium
            ? 'Today'
            : 'When ready',
      whyImportant:
        task.details.trim() ||
        task.description.trim() ||
        'This is on your focus list for today.',
      delayImpact:
        'Leaving this open may push other commitments later in the day.',
      aiRecommendation: 'Start this in your next focused block.',
    };
  }

  private emailToFocus(
    email: {
      id: string;
      provider: IntegrationProvider;
      subject: string | null;
      snippet: string | null;
      fromName: string | null;
      fromAddress: string | null;
      isUnread: boolean;
    },
    index: number,
  ): FocusItemDto {
    const from = email.fromName || email.fromAddress || 'Inbox';
    return {
      id: `mail-${email.id}`,
      platform: mapPlatform('gmail', email.provider, 'gmail'),
      title: email.subject?.trim() || 'Email thread',
      reason: email.isUnread ? `Unread from ${from}` : `Recent from ${from}`,
      estimatedTime: '10 min',
      priority: index < 2 ? 'high' : 'medium',
      confidence: email.isUnread ? 0.82 : 0.7,
      actions: [
        { id: `${email.id}-ask`, label: 'Ask Chief', tone: 'accent' },
        { id: `${email.id}-open`, label: 'Open' },
      ],
      urgencyLabel: email.isUnread ? 'Unread' : 'Recent',
      whyImportant:
        email.snippet?.trim() ||
        'This thread was pulled from your connected Gmail account.',
      delayImpact: 'Leaving inbox threads open stacks follow-ups for later today.',
      aiRecommendation: email.isUnread
        ? 'Skim and reply or archive.'
        : 'Check whether a follow-up is still needed.',
    };
  }

  private emailToSignal(email: {
    id: string;
    provider: IntegrationProvider;
    subject: string | null;
    snippet: string | null;
    fromName: string | null;
    fromAddress: string | null;
    receivedAt: Date | null;
  }): BriefingSignalDto {
    const from = email.fromName || email.fromAddress || 'Inbox';
    return {
      id: email.id,
      platform: mapPlatform('gmail', email.provider, 'gmail'),
      title: email.subject?.trim() || 'Unread email',
      summary: email.snippet?.trim() || `From ${from}`,
      timestamp: formatRelative(email.receivedAt),
    };
  }

  private eventToSignal(event: {
    id: string;
    provider: IntegrationProvider;
    title: string;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
  }): BriefingSignalDto {
    const time = event.startsAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
      hour12: true,
    });
    const summary = event.location?.trim()
      ? `${time} · ${event.location.trim()}`
      : `${time} (UTC)`;
    return {
      id: event.id,
      platform: mapPlatform('calendar', event.provider, 'calendar'),
      title: event.title,
      summary,
      timestamp: time,
    };
  }

  private async resolveWorkspaceId(user: AuthUser, workspaceId?: string) {
    const trimmed = workspaceId?.trim();
    if (trimmed) {
      return trimmed;
    }
    const primary = await this.workspaces.ensureDefaultWorkspace(user);
    return primary.id;
  }
}

function utcDateOnly(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function isFresh(generatedAt: Date, maxAgeMs = 15 * 60 * 1000): boolean {
  return Date.now() - generatedAt.getTime() < maxAgeMs;
}

function hasBriefContent(brief: HomeBriefDto): boolean {
  return brief.focus.length > 0 || brief.briefing.length > 0;
}

function firstName(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0] || trimmed;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0.7;
  return Math.max(0, Math.min(1, value));
}

function mapPlatform(
  raw: string | null | undefined,
  provider: IntegrationProvider | null | undefined,
  fallback: string,
): string {
  const normalized = (raw || '').trim().toLowerCase();
  if (PLATFORMS.has(normalized)) return normalized;

  switch (provider) {
    case IntegrationProvider.google:
      if (normalized.includes('cal')) return 'calendar';
      // Google Tasks map to the task-shaped platform mark until a dedicated icon exists.
      if (normalized === 'asana' || normalized.includes('task')) return 'asana';
      return 'gmail';
    case IntegrationProvider.microsoft:
      return normalized.includes('cal') || normalized.includes('outlook')
        ? 'calendar'
        : 'gmail';
    case IntegrationProvider.slack:
      return 'slack';
    case IntegrationProvider.github:
      return 'github';
    case IntegrationProvider.notion:
      return 'notion';
    default:
      return fallback;
  }
}

function formatRelative(date: Date | null): string {
  if (!date) return 'Recently';
  const deltaMs = Date.now() - date.getTime();
  const minutes = Math.round(deltaMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
