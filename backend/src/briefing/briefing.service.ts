import { Injectable, NotFoundException } from '@nestjs/common';
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
import {
  RELEVANCE_THRESHOLDS,
  scoreCalendarEvent,
  scoreEmail,
  scoreTask,
  toActionableTitle,
} from './relevance.scorer';

const PLATFORMS = new Set([
  'gmail',
  'calendar',
  'slack',
  'github',
  'notion',
  'asana',
  'trello',
]);

type RankedFocus = FocusItemDto & { relevance: number };

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

  /**
   * Mark a Top Priority item done: keep history, drop from active focus,
   * do not resurface on the next compose.
   */
  async completeFocusItem(
    user: AuthUser,
    sourceKey: string,
    workspaceId?: string,
  ): Promise<HomeBriefDto> {
    const wsId = await this.resolveWorkspaceId(user, workspaceId);
    await this.membership.requireMembership(user.id, wsId);

    const key = sourceKey.trim();
    if (!key) {
      throw new NotFoundException('Focus item id required');
    }

    let sourceType = 'unknown';
    let title: string | null = null;

    if (key.startsWith('mail-')) {
      sourceType = 'email';
      const emailId = key.slice('mail-'.length);
      const email = await this.prisma.email.findFirst({
        where: { id: emailId, workspaceId: wsId },
      });
      title = email?.subject ?? null;
    } else if (key.startsWith('event-')) {
      sourceType = 'event';
      const eventId = key.slice('event-'.length);
      const event = await this.prisma.calendarEvent.findFirst({
        where: { id: eventId, workspaceId: wsId },
      });
      title = event?.title ?? null;
    } else {
      sourceType = 'task';
      const task = await this.prisma.task.findFirst({
        where: { id: key, workspaceId: wsId },
      });
      if (task) {
        title = task.title;
        await this.prisma.task.update({
          where: { id: task.id },
          data: {
            status: TaskStatus.done,
            section: TaskSection.completed,
            completedAt: new Date(),
          },
        });
      }
    }

    await this.prisma.focusDismissal.upsert({
      where: {
        workspaceId_sourceKey: { workspaceId: wsId, sourceKey: key },
      },
      create: {
        workspaceId: wsId,
        userId: user.id,
        sourceKey: key,
        sourceType,
        title,
      },
      update: {
        dismissedAt: new Date(),
        title: title ?? undefined,
      },
    });

    // Force recompose so Home drops the item immediately.
    await this.prisma.brief.updateMany({
      where: { workspaceId: wsId, briefDate: utcDateOnly() },
      data: { generatedAt: new Date(0) },
    });

    return this.getHomeBrief(user, wsId);
  }

  private async composeBrief(user: AuthUser, workspaceId: string): Promise<HomeBriefDto> {
    const now = new Date();
    const calendarFrom = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const calendarTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const mailFrom = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    const [tasks, emails, events, dismissals] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          workspaceId,
          status: { not: TaskStatus.done },
          section: { in: [TaskSection.today, TaskSection.upcoming] },
        },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
        take: 40,
      }),
      this.prisma.email.findMany({
        where: {
          workspaceId,
          OR: [{ receivedAt: { gte: mailFrom } }, { receivedAt: null }],
        },
        orderBy: { receivedAt: 'desc' },
        take: 60,
      }),
      this.prisma.calendarEvent.findMany({
        where: {
          workspaceId,
          startsAt: { gte: calendarFrom, lt: calendarTo },
          NOT: { status: 'cancelled' },
        },
        orderBy: { startsAt: 'asc' },
        take: 24,
      }),
      this.prisma.focusDismissal.findMany({
        where: { workspaceId },
        select: { sourceKey: true },
      }),
    ]);

    const dismissed = new Set(dismissals.map((d) => d.sourceKey));

    const rankedFocus: RankedFocus[] = [];
    const briefingCandidates: Array<BriefingSignalDto & { relevance: number }> = [];

    for (const task of tasks) {
      const id = task.id;
      if (dismissed.has(id)) continue;
      const relevance = scoreTask({
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueAt: task.dueAt,
        now,
      });
      if (relevance < RELEVANCE_THRESHOLDS.focus) continue;
      rankedFocus.push({
        ...this.taskToFocus(task, relevance),
        relevance,
      });
    }

    for (const email of emails) {
      const id = `mail-${email.id}`;
      if (dismissed.has(id)) continue;
      const relevance = scoreEmail({
        subject: email.subject,
        snippet: email.snippet,
        bodyText: email.bodyText,
        fromAddress: email.fromAddress,
        fromName: email.fromName,
        labelIds: email.labelIds,
        isUnread: email.isUnread,
        receivedAt: email.receivedAt,
      });
      if (relevance >= RELEVANCE_THRESHOLDS.briefing) {
        briefingCandidates.push({
          ...this.emailToSignal(email, relevance),
          relevance,
        });
      }
      if (relevance >= RELEVANCE_THRESHOLDS.focus) {
        rankedFocus.push({
          ...this.emailToFocus(email, relevance),
          relevance,
        });
      }
    }

    for (const event of events) {
      const id = `event-${event.id}`;
      if (dismissed.has(id)) continue;
      const relevance = scoreCalendarEvent({
        title: event.title,
        description: event.description,
        startsAt: event.startsAt,
        now,
      });
      if (relevance >= RELEVANCE_THRESHOLDS.briefing) {
        briefingCandidates.push({
          ...this.eventToSignal(event),
          relevance,
        });
      }
      if (relevance >= RELEVANCE_THRESHOLDS.focus) {
        rankedFocus.push({
          ...this.eventToFocus(event, relevance),
          relevance,
        });
      }
    }

    rankedFocus.sort((a, b) => b.relevance - a.relevance);
    briefingCandidates.sort((a, b) => b.relevance - a.relevance);

    const focus: FocusItemDto[] = rankedFocus.slice(0, 6).map(({ relevance: _r, ...item }) => item);
    const briefing: BriefingSignalDto[] = briefingCandidates
      .slice(0, 10)
      .map(({ relevance: _r, ...item }) => item);

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
      'Clear your top priorities early and the rest of the day opens up.';
    if (openCount === 0 && signalCount === 0) {
      successInsight =
        'Connect your work apps — Chief will surface deadlines, meetings, and actions that matter.';
    } else if (openCount === 0) {
      successInsight = 'No open priorities — scan briefing for anything that still needs a decision.';
    } else if (openCount <= 3) {
      successInsight = `Clear ${openCount} priority item${openCount === 1 ? '' : 's'} to stay ahead today.`;
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

  private taskToFocus(
    task: {
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
    },
    relevance: number,
  ): FocusItemDto {
    const platform = mapPlatform(task.platform, task.provider, 'notion');
    const estimatedTime =
      task.estimatedTime?.trim() ||
      (task.estimatedMinutes != null ? `${task.estimatedMinutes} min` : '15 min');
    const title = toActionableTitle({ kind: 'task', title: task.title });

    return {
      id: task.id,
      platform,
      title,
      reason:
        task.description.trim() ||
        (task.priority === TaskPriority.high
          ? 'High-priority work on your list.'
          : 'Actionable work for today.'),
      estimatedTime,
      priority: priorityFromScore(relevance, task.priority),
      confidence: clamp01(Math.max(task.confidence ?? 0.7, relevance)),
      actions: [
        { id: `${task.id}-done`, label: 'Mark done', tone: 'accent' },
        { id: `${task.id}-ask`, label: 'Ask Chief' },
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
        'This is actionable work that deserves attention today.',
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
    relevance: number,
  ): FocusItemDto {
    const from = email.fromName || email.fromAddress || 'Inbox';
    const subject = email.subject?.trim() || 'Email thread';
    const title = toActionableTitle({
      kind: 'email',
      title: subject,
      fromName: email.fromName,
    });

    return {
      id: `mail-${email.id}`,
      platform: mapPlatform('gmail', email.provider, 'gmail'),
      title,
      reason: `Meaningful thread from ${from}`,
      estimatedTime: '10 min',
      priority: priorityFromScore(relevance),
      confidence: clamp01(relevance),
      actions: [
        { id: `${email.id}-done`, label: 'Mark done', tone: 'accent' },
        { id: `${email.id}-ask`, label: 'Ask Chief' },
        { id: `${email.id}-open`, label: 'Open' },
      ],
      urgencyLabel: relevance >= 0.7 ? 'Needs action' : 'Follow up',
      whyImportant:
        email.snippet?.trim() ||
        'This thread looks like real work — a deadline, decision, or reply.',
      delayImpact: 'Ignoring this may miss a deadline or block someone waiting on you.',
      aiRecommendation: 'Decide: reply, schedule, or delegate — then mark done.',
    };
  }

  private eventToFocus(
    event: {
      id: string;
      provider: IntegrationProvider;
      title: string;
      startsAt: Date;
      location: string | null;
    },
    relevance: number,
  ): FocusItemDto {
    const title = toActionableTitle({
      kind: 'event',
      title: event.title,
      startsAt: event.startsAt,
    });
    return {
      id: `event-${event.id}`,
      platform: mapPlatform('calendar', event.provider, 'calendar'),
      title,
      reason: event.location?.trim()
        ? `Upcoming · ${event.location.trim()}`
        : 'Upcoming on your calendar',
      estimatedTime: '15 min',
      priority: priorityFromScore(relevance),
      confidence: clamp01(relevance),
      actions: [
        { id: `${event.id}-done`, label: 'Mark done', tone: 'accent' },
        { id: `${event.id}-ask`, label: 'Ask Chief' },
        { id: `${event.id}-open`, label: 'Open' },
      ],
      urgencyLabel: 'Meeting',
      whyImportant: 'Prepare so you walk in ready — agenda, asks, and decisions.',
      delayImpact: 'Showing up unprepared wastes the meeting and follow-ups pile up.',
      aiRecommendation: 'Skim notes and list 2–3 outcomes before it starts.',
    };
  }

  private emailToSignal(
    email: {
      id: string;
      provider: IntegrationProvider;
      subject: string | null;
      snippet: string | null;
      fromName: string | null;
      fromAddress: string | null;
      receivedAt: Date | null;
    },
    relevance: number,
  ): BriefingSignalDto {
    const from = email.fromName || email.fromAddress || 'Inbox';
    return {
      id: email.id,
      platform: mapPlatform('gmail', email.provider, 'gmail'),
      title: email.subject?.trim() || 'Important email',
      summary:
        email.snippet?.trim() ||
        (relevance >= 0.65 ? `Action likely needed · ${from}` : `From ${from}`),
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
      hour12: true,
    });
    const summary = event.location?.trim()
      ? `${time} · ${event.location.trim()}`
      : time;
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

/** Align with 30-minute sync cadence; persist marks stale immediately on new data. */
function isFresh(generatedAt: Date, maxAgeMs = 30 * 60 * 1000): boolean {
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

function priorityFromScore(
  relevance: number,
  fallback?: TaskPriority,
): 'high' | 'medium' | 'low' {
  if (relevance >= 0.7) return 'high';
  if (relevance >= 0.55) return 'medium';
  if (fallback) return fallback;
  return 'low';
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
