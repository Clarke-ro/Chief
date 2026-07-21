import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
  BRIEF_SECTION_ORDER,
  briefSectionFor,
  contextualOpenLabel,
  estimatedMinutesFor,
  RELEVANCE_THRESHOLDS,
  scoreCalendarEvent,
  scoreEmail,
  scoreTask,
  synthesizeFocusNarrative,
  type BriefSection,
  type WorkKind,
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
  private readonly logger = new Logger(BriefingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly workspaces: WorkspaceService,
  ) {}

  async getHomeBrief(
    user: AuthUser,
    workspaceId?: string,
  ): Promise<HomeBriefDto> {
    const wsId = await this.resolveWorkspaceId(user, workspaceId);
    await this.membership.requireMembership(user.id, wsId);

    const briefDate = utcDateOnly();
    const existing = await this.prisma.brief.findUnique({
      where: {
        workspaceId_briefDate: { workspaceId: wsId, briefDate },
      },
    });

    // Never serve a fresh-but-empty cache — sync may have landed after first paint.
    // Also recompose when payload still uses the old inbox-style presentation.
    if (
      existing &&
      isFresh(existing.generatedAt) &&
      isHomeBriefDto(existing.payload) &&
      hasBriefContent(existing.payload) &&
      !needsPresentationRefresh(existing.payload)
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

    await this.recordDismissal({
      workspaceId: wsId,
      userId: user.id,
      sourceKey: key,
      sourceType,
      title,
    });

    // Force recompose so Home drops the item immediately.
    await this.prisma.brief.updateMany({
      where: { workspaceId: wsId, briefDate: utcDateOnly() },
      data: { generatedAt: new Date(0) },
    });

    return this.getHomeBrief(user, wsId);
  }

  /** Safe when focus_dismissal migration hasn't landed yet (SKIP_PRISMA_MIGRATE). */
  private async loadDismissals(
    workspaceId: string,
  ): Promise<Array<{ sourceKey: string }>> {
    try {
      return await this.prisma.focusDismissal.findMany({
        where: { workspaceId },
        select: { sourceKey: true },
      });
    } catch (error) {
      this.logger.warn(
        {
          err: error instanceof Error ? error.message : String(error),
          workspaceId,
        },
        'focus_dismissal unavailable — composing brief without dismissals',
      );
      return [];
    }
  }

  private async recordDismissal(input: {
    workspaceId: string;
    userId: string;
    sourceKey: string;
    sourceType: string;
    title: string | null;
  }) {
    try {
      await this.prisma.focusDismissal.upsert({
        where: {
          workspaceId_sourceKey: {
            workspaceId: input.workspaceId,
            sourceKey: input.sourceKey,
          },
        },
        create: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          sourceKey: input.sourceKey,
          sourceType: input.sourceType,
          title: input.title,
        },
        update: {
          dismissedAt: new Date(),
          title: input.title ?? undefined,
        },
      });
    } catch (error) {
      this.logger.warn(
        {
          err: error instanceof Error ? error.message : String(error),
          sourceKey: input.sourceKey,
        },
        'Could not persist focus dismissal — brief still recomposes',
      );
    }
  }

  private async composeBrief(
    user: AuthUser,
    workspaceId: string,
  ): Promise<HomeBriefDto> {
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
      this.loadDismissals(workspaceId),
    ]);

    const dismissed = new Set(dismissals.map((d) => d.sourceKey));

    const rankedFocus: RankedFocus[] = [];
    const briefingCandidates: Array<BriefingSignalDto & { relevance: number }> =
      [];

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
    briefingCandidates.sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return sectionRank(a.section) - sectionRank(b.section);
    });

    const focus: FocusItemDto[] = rankedFocus
      .slice(0, 6)
      .map(({ relevance: _r, ...item }) => item);

    // Never resurface a Top Priority item again in Today's Brief.
    const focusKeys = new Set(focus.map((item) => item.id));
    const briefing: BriefingSignalDto[] = briefingCandidates
      .filter((candidate) => {
        if (focusKeys.has(candidate.id)) return false;
        if (focusKeys.has(`mail-${candidate.id}`)) return false;
        if (focusKeys.has(`event-${candidate.id}`)) return false;
        return true;
      })
      .slice(0, 10)
      .map(({ relevance: _r, ...item }) => item)
      .sort((a, b) => sectionRank(a.section) - sectionRank(b.section));

    const openCount = focus.length;
    const signalCount = briefing.length;
    const successScore =
      openCount === 0 && signalCount === 0
        ? 0.42
        : Math.max(0.35, Math.min(0.92, 0.88 - openCount * 0.04));

    // Focus Score levels — self-explanatory day readiness (higher ring = more headroom).
    let successLabel = 'On track';
    if (openCount === 0 && signalCount === 0) successLabel = 'Getting started';
    else if (openCount === 0) successLabel = 'Clear day';
    else if (openCount <= 2) successLabel = 'Light day';
    else if (openCount <= 4) successLabel = 'On track';
    else if (openCount <= 5) successLabel = 'Tight day';
    else successLabel = 'Heavy day';

    let successInsight =
      'Clear your top priorities early and the rest of the day opens up.';
    if (openCount === 0 && signalCount === 0) {
      successInsight =
        'Connect your work apps — Chief will surface deadlines, meetings, and actions that matter.';
    } else if (openCount === 0) {
      successInsight =
        'No open priorities — scan the brief for anything that still needs a decision.';
    } else if (openCount <= 3) {
      successInsight = `Clear ${openCount} priority item${openCount === 1 ? '' : 's'} to stay ahead today.`;
    } else {
      successInsight = `${openCount} priorities need attention — tackle the top ones first.`;
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
      dueAt: Date | null;
    },
    relevance: number,
  ): FocusItemDto {
    const platform = mapPlatform(task.platform, task.provider, 'notion');
    const narrative = synthesizeFocusNarrative({
      kind: 'task',
      title: task.title,
      snippet: task.description,
      bodyText: task.details,
      dueAt: task.dueAt,
    });
    const estimatedTime =
      task.estimatedTime?.trim() ||
      (task.estimatedMinutes != null
        ? `${task.estimatedMinutes} min`
        : estimatedMinutesFor(narrative.workKind));
    return {
      id: task.id,
      platform,
      title: shortFocusTitle(narrative.headline),
      reason: truncateJoin([narrative.reasonHint, `Est. ${estimatedTime}`], 88),
      estimatedTime,
      priority: priorityFromScore(relevance, task.priority),
      confidence: clamp01(Math.max(task.confidence ?? 0.7, relevance)),
      actions: [
        { id: `${task.id}-done`, label: 'Mark done', tone: 'accent' },
        { id: `${task.id}-ask`, label: 'Ask Chief', execution: 'ask_chief' },
      ],
      urgencyLabel:
        narrative.workKind === 'deadline'
          ? 'Deadline'
          : task.priority === TaskPriority.high
            ? 'High priority'
            : task.priority === TaskPriority.medium
              ? 'Today'
              : 'When ready',
      aboutTitle: narrative.aboutTitle,
      aboutBody: narrative.aboutBody,
      actionTitle: narrative.actionTitle,
      actionBody: narrative.actionBody,
      whyImportant: narrative.aboutBody,
      delayImpact: narrative.actionBody,
      aiRecommendation: narrative.recommendation,
    };
  }

  private emailToFocus(
    email: {
      id: string;
      provider: IntegrationProvider;
      subject: string | null;
      snippet: string | null;
      bodyText: string | null;
      fromName: string | null;
      fromAddress: string | null;
      isUnread: boolean;
      threadId: string | null;
    },
    relevance: number,
  ): FocusItemDto {
    const subject = email.subject?.trim() || 'Email thread';
    const narrative = synthesizeFocusNarrative({
      kind: 'email',
      title: subject,
      fromName: email.fromName,
      snippet: email.snippet,
      bodyText: email.bodyText,
    });
    const estimatedTime = estimatedMinutesFor(narrative.workKind);
    const gmailUrl = gmailThreadUrl(email.provider, email.threadId);

    return {
      id: `mail-${email.id}`,
      platform: mapPlatform('gmail', email.provider, 'gmail'),
      title: shortFocusTitle(narrative.headline),
      reason: truncateJoin([narrative.reasonHint, `Est. ${estimatedTime}`], 88),
      estimatedTime,
      priority: priorityFromScore(relevance),
      confidence: clamp01(relevance),
      actions: [
        { id: `${email.id}-done`, label: 'Mark done', tone: 'accent' },
        { id: `${email.id}-ask`, label: 'Ask Chief', execution: 'ask_chief' },
        ...(gmailUrl
          ? [
              {
                id: `${email.id}-open`,
                label: contextualOpenLabel(narrative.workKind),
                execution: 'handoff' as const,
                handoff: {
                  target: 'gmail' as const,
                  url: gmailUrl,
                  summary: gmailHandoffSummary(narrative.workKind),
                },
              },
            ]
          : []),
      ],
      urgencyLabel: urgencyForWorkKind(narrative.workKind, relevance),
      aboutTitle: narrative.aboutTitle,
      aboutBody: narrative.aboutBody,
      actionTitle: narrative.actionTitle,
      actionBody: narrative.actionBody,
      whyImportant: narrative.aboutBody,
      delayImpact: narrative.actionBody,
      aiRecommendation: narrative.recommendation,
    };
  }

  private eventToFocus(
    event: {
      id: string;
      provider: IntegrationProvider;
      title: string;
      description: string | null;
      startsAt: Date;
      location: string | null;
      htmlLink: string | null;
    },
    relevance: number,
  ): FocusItemDto {
    const narrative = synthesizeFocusNarrative({
      kind: 'event',
      title: event.title,
      startsAt: event.startsAt,
      snippet: event.description,
      bodyText: event.location,
    });
    const estimatedTime = estimatedMinutesFor(narrative.workKind);
    const calendarUrl = googleCalendarEventUrl(event.provider, event.htmlLink);
    return {
      id: `event-${event.id}`,
      platform: mapPlatform('calendar', event.provider, 'calendar'),
      title: shortFocusTitle(narrative.headline),
      reason: truncateJoin([narrative.reasonHint, `Est. ${estimatedTime}`], 88),
      estimatedTime,
      priority: priorityFromScore(relevance),
      confidence: clamp01(relevance),
      actions: [
        { id: `${event.id}-done`, label: 'Mark done', tone: 'accent' },
        { id: `${event.id}-ask`, label: 'Ask Chief', execution: 'ask_chief' },
        ...(calendarUrl
          ? [
              {
                id: `${event.id}-open`,
                label: contextualOpenLabel(narrative.workKind),
                execution: 'handoff' as const,
                handoff: {
                  target: 'calendar' as const,
                  url: calendarUrl,
                  summary: calendarHandoffSummary(narrative.workKind),
                },
              },
            ]
          : []),
      ],
      urgencyLabel: 'Meeting',
      aboutTitle: narrative.aboutTitle,
      aboutBody: narrative.aboutBody,
      actionTitle: narrative.actionTitle,
      actionBody: narrative.actionBody,
      whyImportant: narrative.aboutBody,
      delayImpact: narrative.actionBody,
      aiRecommendation: narrative.recommendation,
    };
  }

  private emailToSignal(
    email: {
      id: string;
      provider: IntegrationProvider;
      subject: string | null;
      snippet: string | null;
      bodyText: string | null;
      fromName: string | null;
      fromAddress: string | null;
      receivedAt: Date | null;
    },
    _relevance: number,
  ): BriefingSignalDto {
    const subject = email.subject?.trim() || 'Needs a look';
    const narrative = synthesizeFocusNarrative({
      kind: 'email',
      title: subject,
      fromName: email.fromName,
      snippet: email.snippet,
      bodyText: email.bodyText,
    });
    return {
      id: email.id,
      platform: mapPlatform('gmail', email.provider, 'gmail'),
      section: briefSectionFor(narrative.workKind),
      title: narrative.headline,
      summary: narrative.briefBullets,
      timestamp: formatRelative(email.receivedAt),
    };
  }

  private eventToSignal(event: {
    id: string;
    provider: IntegrationProvider;
    title: string;
    description: string | null;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
  }): BriefingSignalDto {
    const narrative = synthesizeFocusNarrative({
      kind: 'event',
      title: event.title,
      startsAt: event.startsAt,
      snippet: event.description,
      bodyText: event.location,
    });
    const time = event.startsAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return {
      id: event.id,
      platform: mapPlatform('calendar', event.provider, 'calendar'),
      section: briefSectionFor(narrative.workKind),
      title: narrative.headline,
      summary: narrative.briefBullets,
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

/** True when cached brief still uses older presentation rules. */
function needsPresentationRefresh(brief: HomeBriefDto): boolean {
  if (brief.successLabel === 'Packed' || brief.successLabel === 'Clear focus') {
    return true;
  }
  // Old Focus actions were label-only, so the client guessed a generic destination.
  // Refresh them once so each source handoff is explicit and verifiable.
  if (
    brief.focus.some((item) =>
      item.actions.some(
        (action) =>
          action.id.endsWith('-open') &&
          (action.execution !== 'handoff' || !action.handoff?.url),
      ),
    )
  ) {
    return true;
  }
  if (brief.focus.some((item) => /Meaningful thread from/i.test(item.reason))) {
    return true;
  }
  if (
    brief.briefing.length > 0 &&
    brief.briefing.every((signal) => !signal.section)
  ) {
    return true;
  }
  // Recompose when Brief still duplicates a Focus item (pre-dedupe cache).
  const focusKeys = new Set(brief.focus.map((item) => item.id));
  if (
    brief.briefing.some(
      (signal) =>
        focusKeys.has(signal.id) ||
        focusKeys.has(`mail-${signal.id}`) ||
        focusKeys.has(`event-${signal.id}`),
    )
  ) {
    return true;
  }
  // Older headlines were short subject-style truncations (< 40 chars often).
  if (
    brief.focus.some((item) =>
      /^(Respond to|Follow up:|Submit:|Approve:)/i.test(item.title),
    )
  ) {
    return true;
  }
  if (brief.briefing.some((signal) => /^Respond to /i.test(signal.title))) {
    return true;
  }
  // Older briefs used a single paragraph summary instead of list blocks.
  if (
    brief.briefing.some(
      (signal) => signal.summary.length > 0 && !signal.summary.includes('•'),
    )
  ) {
    return true;
  }
  // Older focus detail still used hardcoded delay copy / missing narrative titles.
  if (
    brief.focus.some(
      (item) =>
        !('aboutTitle' in item) ||
        !item.aboutTitle ||
        /Ignoring this may miss a deadline/i.test(item.delayImpact) ||
        /Showing up unprepared wastes the meeting/i.test(item.delayImpact),
    )
  ) {
    return true;
  }
  return false;
}

function gmailThreadUrl(
  provider: IntegrationProvider,
  threadId: string | null,
): string | null {
  if (provider !== IntegrationProvider.google) return null;
  const id = threadId?.trim();
  if (!id || id.length > 256 || /[\u0000-\u001F\u007F]/.test(id)) return null;
  return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(id)}`;
}

function googleCalendarEventUrl(
  provider: IntegrationProvider,
  htmlLink: string | null,
): string | null {
  if (provider !== IntegrationProvider.google || !htmlLink) return null;

  try {
    const url = new URL(htmlLink);
    const host = url.hostname.toLowerCase();
    const isCalendarUrl =
      host === 'calendar.google.com' ||
      (host === 'www.google.com' && url.pathname.startsWith('/calendar/'));
    if (url.protocol !== 'https:' || !isCalendarUrl) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function gmailHandoffSummary(workKind: WorkKind): string {
  switch (workKind) {
    case 'invoice':
      return 'Opens the billing email in Gmail so you can pay or update payment.';
    case 'security':
      return 'Opens the security alert in Gmail so you can confirm or revoke access.';
    case 'deadline':
      return 'Opens the source email in Gmail for deadline details and next steps.';
    case 'email':
      return 'Opens this thread in Gmail so you can reply.';
    default:
      return 'Opens the source email in Gmail to continue.';
  }
}

function calendarHandoffSummary(workKind: WorkKind): string {
  return workKind === 'meeting'
    ? 'Opens this event in Google Calendar so you can prepare or update it.'
    : 'Opens this event in Google Calendar to continue.';
}

function shortFocusTitle(headline: string): string {
  const trimmed = headline.trim();
  if (trimmed.length <= 72) return trimmed;
  return `${trimmed.slice(0, 71)}…`;
}

function truncateJoin(
  parts: Array<string | null | undefined>,
  max: number,
): string {
  const value = parts.filter(Boolean).join(' · ').replace(/\s+/g, ' ').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
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

function sectionRank(section?: string | null): number {
  if (!section) return BRIEF_SECTION_ORDER.length;
  const index = BRIEF_SECTION_ORDER.indexOf(section as BriefSection);
  return index === -1 ? BRIEF_SECTION_ORDER.length : index;
}

function urgencyForWorkKind(workKind: WorkKind, relevance: number): string {
  switch (workKind) {
    case 'deadline':
      return 'Deadline';
    case 'invoice':
      return 'Payment';
    case 'security':
      return 'Security';
    case 'career':
      return 'Career';
    case 'approval':
      return 'Approval';
    case 'document':
      return 'Review';
    case 'meeting':
      return 'Meeting';
    default:
      return relevance >= 0.7 ? 'Needs action' : 'Follow up';
  }
}
