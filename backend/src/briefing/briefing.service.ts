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
import type { WorkspaceContextPayload } from '../context/workspace-context.types';
import { KnowledgeEngineService } from '../knowledge/knowledge-engine.service';
import type { WorkspaceKnowledge } from '../knowledge/knowledge.types';
import { MembershipService } from '../membership/membership.service';
import { PlannerService } from '../planner/planner.service';
import type { WorkspaceUnderstanding } from '../workspace-engine/workspace-engine.types';
import { WorkspaceService } from '../workspace/workspace.service';
import {
  findRelatedPriority,
  findSchedulePriorityConflicts,
  type PriorityRef,
} from './briefing.conflicts';
import {
  type BriefingSignalDto,
  type FocusActionDto,
  type FocusItemDto,
  type HomeBriefDto,
  isHomeBriefDto,
} from './briefing.types';
import {
  BRIEF_SECTION_ORDER,
  briefSectionFor,
  classifyWorkKind,
  contextualOpenLabel,
  estimatedMinutesFor,
  isFocusEligible,
  isNoiseLoginOrDeviceAlert,
  RELEVANCE_THRESHOLDS,
  scoreEmail,
  scoreTask,
  shouldDeferAlertSurfacing,
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

/** Max Top Priorities returned (Home shows 6, then View more). */
const FOCUS_ITEM_LIMIT = 12;

type RankedFocus = FocusItemDto & { relevance: number };

@Injectable()
export class BriefingService {
  private readonly logger = new Logger(BriefingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly workspaces: WorkspaceService,
    private readonly knowledgeEngine: KnowledgeEngineService,
    private readonly planner: PlannerService,
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
        generatedAt: existing.generatedAt.toISOString(),
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

    return { ...composed, generatedAt: new Date().toISOString() };
  }

  /**
   * Worker entry: compose + persist a brief for a workspace (no HTTP session).
   * Uses the given user when provided; otherwise the workspace owner/first member.
   */
  async generateForWorkspace(
    workspaceId: string,
    userId?: string,
  ): Promise<HomeBriefDto | null> {
    const member = await this.resolveMemberUser(workspaceId, userId);
    if (!member) {
      this.logger.warn({ workspaceId }, 'No member for briefing.generate — skipping');
      return null;
    }

    const authUser: AuthUser = {
      id: member.id,
      email: member.email,
      name: member.name,
      image: member.image,
    };

    const briefDate = utcDateOnly();
    const composed = await this.composeBrief(authUser, workspaceId);
    const generatedAt = new Date();
    await this.prisma.brief.upsert({
      where: {
        workspaceId_briefDate: { workspaceId, briefDate },
      },
      create: {
        workspaceId,
        userId: authUser.id,
        briefDate,
        userName: composed.userName,
        successScore: composed.successScore,
        successLabel: composed.successLabel,
        successInsight: composed.successInsight,
        payload: composed as unknown as Prisma.InputJsonValue,
        generatedAt,
      },
      update: {
        userId: authUser.id,
        userName: composed.userName,
        successScore: composed.successScore,
        successLabel: composed.successLabel,
        successInsight: composed.successInsight,
        payload: composed as unknown as Prisma.InputJsonValue,
        generatedAt,
      },
    });

    return { ...composed, generatedAt: generatedAt.toISOString() };
  }

  /** Weekday morning fan-out: one generate job per workspace with active members. */
  async enqueueMorningFanout(
    enqueue: (workspaceId: string, userId: string) => Promise<void>,
  ): Promise<{ enqueued: number }> {
    const memberships = await this.prisma.membership.findMany({
      select: { workspaceId: true, userId: true },
      orderBy: { createdAt: 'asc' },
    });

    const seen = new Set<string>();
    let enqueued = 0;
    for (const row of memberships) {
      if (seen.has(row.workspaceId)) continue;
      seen.add(row.workspaceId);
      await enqueue(row.workspaceId, row.userId);
      enqueued += 1;
    }
    return { enqueued };
  }

  private async resolveMemberUser(workspaceId: string, userId?: string) {
    if (userId) {
      const membership = await this.prisma.membership.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId },
        },
        include: { user: true },
      });
      return membership?.user ?? null;
    }

    const membership = await this.prisma.membership.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
      include: { user: true },
    });
    return membership?.user ?? null;
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

    const [tasks, emails, events, dismissals, knowledge] = await Promise.all([
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
      this.knowledgeEngine.loadSnapshot(workspaceId),
    ]);

    const dismissed = new Set(dismissals.map((d) => d.sourceKey));

    const rankedFocus: RankedFocus[] = [];
    const briefingCandidates: Array<BriefingSignalDto & { relevance: number }> =
      [];
    type DeferredAlert = {
      email: (typeof emails)[number];
      workKind: WorkKind;
      relevance: number;
    };
    const deferredAlerts: DeferredAlert[] = [];

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

      // Never put unrecognized-device / login noise on Home — Schedule/Focus stay clean.
      if (
        isNoiseLoginOrDeviceAlert(
          email.subject ?? '',
          email.snippet,
          email.bodyText,
        )
      ) {
        continue;
      }

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
      const workKind = classifyWorkKind({
        kind: 'email',
        title: email.subject ?? '',
        snippet: email.snippet,
        bodyText: email.bodyText,
      });

      // Drop routine security/finance mail from Home unless held for priority relation.
      if (workKind === 'security' || workKind === 'invoice') {
        if (
          shouldDeferAlertSurfacing(
            workKind,
            email.subject ?? '',
            email.snippet,
            email.bodyText,
          )
        ) {
          deferredAlerts.push({ email, workKind, relevance });
        }
        continue;
      }

      if (relevance >= RELEVANCE_THRESHOLDS.briefing) {
        briefingCandidates.push({
          ...this.emailToSignal(email, relevance),
          relevance,
        });
      }
      if (
        relevance >= RELEVANCE_THRESHOLDS.focus &&
        isFocusEligible({
          workKind,
          title: email.subject ?? '',
          snippet: email.snippet,
          bodyText: email.bodyText,
          source: 'email',
        })
      ) {
        rankedFocus.push({
          ...this.emailToFocus(email, relevance),
          relevance,
        });
      }
    }

    // Calendar stays on Schedule. Focus only gets derived conflict cards later.

    rankedFocus.sort((a, b) => b.relevance - a.relevance);
    briefingCandidates.sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return sectionRank(a.section) - sectionRank(b.section);
    });

    const { focus: plannedFocus, plannerNotes } = this.applyPlannerToFocus(
      workspaceId,
      knowledge,
      rankedFocus,
    );

    const priorityRefs: PriorityRef[] = plannedFocus.map((item) => ({
      id: item.id,
      title: item.title,
      reason: item.reason,
      priority: item.priority,
      urgencyLabel: item.urgencyLabel,
      relevance: rankedFocus.find((r) => r.id === item.id)?.relevance ?? 0.7,
      platform: item.platform,
    }));

    const derivedFocus: RankedFocus[] = [];

    const scheduleConflicts = findSchedulePriorityConflicts(
      events.map((event) => ({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
      })),
      priorityRefs,
      now,
    );

    for (const conflict of scheduleConflicts) {
      if (dismissed.has(`conflict-${conflict.block.id}`)) continue;
      const event = events.find((e) => e.id === conflict.block.id);
      derivedFocus.push({
        ...this.conflictToFocus(conflict, event?.htmlLink ?? null, event?.provider ?? null),
        relevance: 0.92,
      });
    }

    for (const alert of deferredAlerts) {
      if (
        isNoiseLoginOrDeviceAlert(
          alert.email.subject ?? '',
          alert.email.snippet,
          alert.email.bodyText,
        )
      ) {
        continue;
      }
      const related = findRelatedPriority(
        {
          title: alert.email.subject ?? '',
          snippet: alert.email.snippet,
          bodyText: alert.email.bodyText,
          fromAddress: alert.email.fromAddress,
        },
        priorityRefs,
      );
      if (!related) continue;
      if (dismissed.has(`related-${alert.email.id}`)) continue;

      // Related payment/account risk → Focus only (not a Brief spam section).
      derivedFocus.push({
        ...this.relatedAlertToFocus(alert.email, alert.workKind, related.priority),
        relevance: Math.max(alert.relevance, 0.78),
      });
    }

    const focus = [...derivedFocus, ...plannedFocus.map((item) => ({
      ...item,
      relevance: rankedFocus.find((r) => r.id === item.id)?.relevance ?? 0.7,
    }))]
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, FOCUS_ITEM_LIMIT)
      .map(({ relevance: _r, ...item }) => item);

    // Never resurface a Top Priority item again in Today's Brief.
    const focusKeys = new Set(focus.map((item) => item.id));
    const briefing: BriefingSignalDto[] = capBriefingSignals(
      briefingCandidates
        .filter((candidate) => {
          if (focusKeys.has(candidate.id)) return false;
          if (focusKeys.has(`mail-${candidate.id}`)) return false;
          if (focusKeys.has(`event-${candidate.id}`)) return false;
          if (focusKeys.has(`related-${candidate.id}`)) return false;
          return true;
        })
        .sort((a, b) => b.relevance - a.relevance)
        .map(({ relevance: _r, ...item }) => item),
    );

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

    if (plannerNotes[0]) {
      successInsight = `${successInsight} ${plannerNotes[0]}`;
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

  /**
   * Deterministic Planner pass — boosts overdue / conflicts / recommended focus.
   * Does not call the LLM; HomeBriefDto shape stays identical.
   */
  private applyPlannerToFocus(
    workspaceId: string,
    knowledge: WorkspaceKnowledge,
    rankedFocus: RankedFocus[],
  ): { focus: FocusItemDto[]; plannerNotes: string[] } {
    const preliminary = rankedFocus.slice(0, 8);
    const priorities = preliminary.map((item) => ({
      id: item.id,
      title: item.title,
      reason: item.reason,
      priority: item.priority,
      urgencyLabel: item.urgencyLabel,
      estimatedTime: item.estimatedTime,
      platform: item.platform,
    }));

    const deadlines = [
      ...knowledge.tasks
        .filter((task) => task.dueAt != null || Boolean(task.dueLabel?.trim()))
        .slice(0, 8)
        .map((task) => ({
          id: task.id,
          title: task.title,
          dueAt: task.dueAt,
          dueLabel: task.dueLabel,
          priority: task.priority,
        })),
      ...preliminary
        .filter((item) =>
          /deadline|due|submit/i.test(`${item.urgencyLabel} ${item.title}`),
        )
        .slice(0, 4)
        .map((item) => ({
          id: item.id,
          title: item.title,
          dueLabel: item.estimatedTime,
          priority: item.priority,
        })),
    ].slice(0, 8);

    const context: WorkspaceContextPayload = {
      brief: '',
      priorities,
      meetings: knowledge.meetings,
      deadlines,
      recentEmails: knowledge.recentEmails,
      github: knowledge.github,
      slack: knowledge.slack,
      tasks: knowledge.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        section: task.section,
        priority: task.priority,
        dueLabel: task.dueLabel,
        estimatedTime: task.estimatedTime,
      })),
    };

    const understanding: WorkspaceUnderstanding = {
      workspaceId,
      context,
      knowledge,
      understanding: {
        focusCount: priorities.length,
        meetingCount: knowledge.meetings.length,
        openDeadlineCount: deadlines.length,
        unreadEmailCount: knowledge.recentEmails.filter((e) => e.isUnread).length,
        openTaskCount: knowledge.tasks.length,
      },
    };

    const plan = this.planner.plan(understanding);
    const boost = new Map<string, number>();
    plan.recommendedFocus.forEach((rec, index) => {
      const score = 120 - index * 12;
      for (const key of [rec.id, `event-${rec.id}`, `mail-${rec.id}`]) {
        boost.set(key, Math.max(boost.get(key) ?? 0, score));
      }
    });
    for (const d of plan.overdueDeadlines) {
      for (const key of [d.id, `event-${d.id}`, `mail-${d.id}`]) {
        boost.set(key, Math.max(boost.get(key) ?? 0, 140));
      }
    }
    for (const c of plan.calendarConflicts) {
      for (const key of [c.aId, c.bId, `event-${c.aId}`, `event-${c.bId}`]) {
        boost.set(key, Math.max(boost.get(key) ?? 0, 110));
      }
    }

    const resorted = [...rankedFocus].sort((a, b) => {
      const ba = boost.get(a.id) ?? 0;
      const bb = boost.get(b.id) ?? 0;
      if (ba !== bb) return bb - ba;
      return b.relevance - a.relevance;
    });

    return {
      focus: resorted.slice(0, FOCUS_ITEM_LIMIT).map(({ relevance: _r, ...item }) => item),
      plannerNotes: plan.notes.slice(0, 2),
    };
  }

  /** Derived Focus card: protect work time by rescheduling a flexible calendar block. */
  private conflictToFocus(
    conflict: {
      block: { id: string; title: string; startsAt: Date; endsAt: Date };
      priority: PriorityRef;
    },
    htmlLink: string | null,
    provider: IntegrationProvider | null,
  ): FocusItemDto {
    const blockTitle = conflict.block.title.trim() || 'calendar block';
    const workTitle = conflict.priority.title.trim() || 'your priority';
    const when = conflict.block.startsAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const aboutBody = `${blockTitle} is on your schedule at ${when}, while “${workTitle}” is a tight priority today. Protect time for the work that needs finishing.`;
    const actionBody = `Reschedule or shorten ${blockTitle} so you can complete “${workTitle}” before the day gets away from you.`;
    const calendarUrl = googleCalendarHandoffUrl(
      provider ?? IntegrationProvider.google,
      htmlLink,
    );
    const id = `conflict-${conflict.block.id}`;
    return {
      id,
      platform: 'calendar',
      title: shortFocusTitle(`Reschedule ${blockTitle} — protect “${workTitle}”`),
      reason: truncateJoin([`Conflicts with ${workTitle}`, 'Est. 10 min'], 88),
      estimatedTime: '10 min',
      priority: 'high',
      confidence: 0.9,
      actions: [
        { id: `${id}-done`, label: 'Mark done', tone: 'accent' },
        { id: `${id}-ask`, label: 'Ask Chief', execution: 'ask_chief' },
        ...(calendarUrl
          ? [
              {
                id: `${id}-open`,
                label: 'Open Calendar',
                execution: 'handoff' as const,
                handoff: {
                  target: 'calendar' as const,
                  url: calendarUrl,
                  summary: 'Reschedule this block around your priority.',
                },
              },
            ]
          : []),
      ],
      urgencyLabel: 'Schedule conflict',
      aboutTitle: 'Schedule vs priority',
      aboutBody,
      actionTitle: 'What to do',
      actionBody,
      whyImportant: aboutBody,
      delayImpact: actionBody,
      aiRecommendation: actionBody,
    };
  }

  /** Derived Focus card: alert only because it ties to a Top Priority. */
  private relatedAlertToFocus(
    email: {
      id: string;
      provider: IntegrationProvider;
      subject: string | null;
      snippet: string | null;
      bodyText: string | null;
      threadId: string | null;
    },
    workKind: WorkKind,
    priority: PriorityRef,
  ): FocusItemDto {
    const subject = email.subject?.trim() || 'Account alert';
    const id = `related-${email.id}`;
    const kindLabel = workKind === 'invoice' ? 'Payment' : 'Account';
    const aboutBody = `This ${kindLabel.toLowerCase()} alert looks related to your priority “${priority.title}”. Resolve it so that work isn’t blocked.`;
    const actionBody =
      workKind === 'invoice'
        ? `Fix the billing issue tied to “${priority.title}”, then return to the priority itself.`
        : `Confirm the account alert related to “${priority.title}”, then continue the priority.`;
    const gmailUrl = gmailHandoffUrl(email.provider, email.threadId, subject);
    return {
      id,
      platform: mapPlatform('gmail', email.provider, 'gmail'),
      title: shortFocusTitle(`${kindLabel} risk for “${priority.title}”`),
      reason: truncateJoin([subject, 'Est. 10 min'], 88),
      estimatedTime: '10 min',
      priority: 'high',
      confidence: 0.86,
      actions: buildEmailFocusActions(id, workKind, gmailUrl),
      urgencyLabel: 'Related risk',
      aboutTitle: `${kindLabel} tied to a priority`,
      aboutBody,
      actionTitle: 'What to do',
      actionBody,
      whyImportant: aboutBody,
      delayImpact: actionBody,
      aiRecommendation: actionBody,
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
      actions: buildTaskFocusActions(task.id, narrative.workKind),
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
    const gmailUrl = gmailHandoffUrl(email.provider, email.threadId, subject);

    return {
      id: `mail-${email.id}`,
      platform: mapPlatform('gmail', email.provider, 'gmail'),
      title: shortFocusTitle(narrative.headline),
      reason: truncateJoin([narrative.reasonHint, `Est. ${estimatedTime}`], 88),
      estimatedTime,
      priority: priorityFromScore(relevance),
      confidence: clamp01(relevance),
      actions: buildEmailFocusActions(email.id, narrative.workKind, gmailUrl),
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
    const calendarUrl = googleCalendarHandoffUrl(event.provider, event.htmlLink);
    return {
      id: `event-${event.id}`,
      platform: mapPlatform('calendar', event.provider, 'calendar'),
      title: shortFocusTitle(narrative.headline),
      reason: truncateJoin([narrative.reasonHint, `Est. ${estimatedTime}`], 88),
      estimatedTime,
      priority: priorityFromScore(relevance),
      confidence: clamp01(relevance),
      actions: buildEventFocusActions(event.id, narrative.workKind, calendarUrl),
      urgencyLabel: 'Calendar',
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
  // Calendar events used to flood Top Priorities — force one recompose.
  if (brief.focus.some((item) => item.id.startsWith('event-'))) {
    return true;
  }
  if (brief.focus.some((item) => item.urgencyLabel === 'Meeting')) {
    return true;
  }
  if (brief.briefing.some((signal) => signal.section === 'Meetings')) {
    return true;
  }
  // Drop cached login/device noise that should never have been on Home.
  if (
    brief.focus.some((item) =>
      isNoiseLoginOrDeviceAlert(item.title, item.reason, item.aboutBody),
    ) ||
    brief.briefing.some((signal) =>
      isNoiseLoginOrDeviceAlert(signal.title, signal.summary, null),
    )
  ) {
    return true;
  }
  if (
    brief.focus.some(
      (item) =>
        item.urgencyLabel === 'Security' ||
        (item.urgencyLabel === 'Related risk' &&
          /device|login|sign[- ]?in|unrecognized|unrecognised/i.test(
            `${item.title} ${item.reason}`,
          )),
    )
  ) {
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
  // Sparse / basics-only action sets (Mark done + Ask Chief ± one open) should recompose.
  if (
    brief.focus.some((item) => {
      if (item.actions.length < 4) return true;
      return item.actions.every(
        (action) =>
          action.id.endsWith('-done') ||
          action.id.endsWith('-ask') ||
          action.id.endsWith('-open'),
      );
    })
  ) {
    return true;
  }
  // Mail/calendar focus without a handoff URL should recompose with fallback destinations.
  if (
    brief.focus.some(
      (item) =>
        (item.id.startsWith('mail-') || item.id.startsWith('event-')) &&
        !item.actions.some(
          (action) => action.execution === 'handoff' && Boolean(action.handoff?.url),
        ),
    )
  ) {
    return true;
  }
  return false;
}

function buildEmailFocusActions(
  emailId: string,
  workKind: WorkKind,
  gmailUrl: string | null,
): FocusActionDto[] {
  const actions: FocusActionDto[] = [
    { id: `${emailId}-done`, label: 'Mark done', tone: 'accent' },
    { id: `${emailId}-ask`, label: 'Ask Chief', execution: 'ask_chief' },
  ];

  if (gmailUrl) {
    actions.push({
      id: `${emailId}-open`,
      label: contextualOpenLabel(workKind),
      execution: 'handoff',
      handoff: {
        target: 'gmail',
        url: gmailUrl,
        summary: gmailHandoffSummary(workKind),
      },
    });
  }

  switch (workKind) {
    case 'invoice':
      actions.push(
        { id: `${emailId}-draft`, label: 'Draft dispute' },
        { id: `${emailId}-explain`, label: 'What do I owe?', execution: 'ask_chief' },
      );
      break;
    case 'security':
      actions.push(
        { id: `${emailId}-explain`, label: 'Is this safe?', execution: 'ask_chief' },
        { id: `${emailId}-summar`, label: 'Summarize alert', execution: 'ask_chief' },
      );
      break;
    case 'deadline':
      actions.push(
        { id: `${emailId}-plan`, label: 'Make a plan', execution: 'ask_chief' },
        { id: `${emailId}-block`, label: 'Block time' },
      );
      break;
    case 'career':
      actions.push(
        { id: `${emailId}-draft`, label: 'Draft reply' },
        { id: `${emailId}-prep`, label: 'Prep me', execution: 'ask_chief' },
      );
      break;
    case 'approval':
      actions.push(
        { id: `${emailId}-draft`, label: 'Draft decision' },
        { id: `${emailId}-explain`, label: 'Explain ask', execution: 'ask_chief' },
      );
      break;
    case 'document':
      actions.push(
        { id: `${emailId}-summar`, label: 'Summarize', execution: 'ask_chief' },
        { id: `${emailId}-draft`, label: 'Draft feedback' },
      );
      break;
    default:
      actions.push(
        { id: `${emailId}-draft`, label: 'Draft reply' },
        { id: `${emailId}-explain`, label: 'Explain', execution: 'ask_chief' },
        { id: `${emailId}-summar`, label: 'Summarize', execution: 'ask_chief' },
      );
      break;
  }

  return actions;
}

function buildEventFocusActions(
  eventId: string,
  workKind: WorkKind,
  calendarUrl: string | null,
): FocusActionDto[] {
  const actions: FocusActionDto[] = [
    { id: `${eventId}-done`, label: 'Mark done', tone: 'accent' },
    { id: `${eventId}-ask`, label: 'Ask Chief', execution: 'ask_chief' },
  ];

  if (calendarUrl) {
    actions.push({
      id: `${eventId}-open`,
      label: contextualOpenLabel(workKind === 'meeting' ? 'meeting' : workKind),
      execution: 'handoff',
      handoff: {
        target: 'calendar',
        url: calendarUrl,
        summary: calendarHandoffSummary(workKind),
      },
    });
  }

  actions.push(
    { id: `${eventId}-agenda`, label: 'Prep agenda', execution: 'ask_chief' },
    { id: `${eventId}-reschedule`, label: 'Reschedule' },
    { id: `${eventId}-find`, label: 'Find time' },
  );

  return actions;
}

function buildTaskFocusActions(taskId: string, workKind: WorkKind): FocusActionDto[] {
  return [
    { id: `${taskId}-done`, label: 'Mark done', tone: 'accent' },
    { id: `${taskId}-ask`, label: 'Ask Chief', execution: 'ask_chief' },
    { id: `${taskId}-plan`, label: 'Make a plan', execution: 'ask_chief' },
    { id: `${taskId}-block`, label: 'Block time' },
    {
      id: `${taskId}-start`,
      label: contextualOpenLabel(workKind === 'task' ? 'task' : workKind),
      execution: 'ask_chief',
    },
  ];
}

function gmailHandoffUrl(
  provider: IntegrationProvider,
  threadId: string | null,
  subject?: string | null,
): string | null {
  if (provider !== IntegrationProvider.google) return null;
  const id = threadId?.trim();
  if (id && id.length <= 256 && !/[\u0000-\u001F\u007F]/.test(id)) {
    return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(id)}`;
  }
  const query = subject?.trim();
  if (query) {
    return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`;
  }
  return 'https://mail.google.com/mail/u/0/#inbox';
}

function googleCalendarHandoffUrl(
  provider: IntegrationProvider,
  htmlLink: string | null,
): string | null {
  if (provider !== IntegrationProvider.google) return null;
  if (htmlLink) {
    try {
      const url = new URL(htmlLink);
      const host = url.hostname.toLowerCase();
      const isCalendarUrl =
        host === 'calendar.google.com' ||
        (host === 'www.google.com' && url.pathname.startsWith('/calendar/'));
      if (url.protocol === 'https:' && isCalendarUrl) {
        return url.toString();
      }
    } catch {
      // fall through to calendar home
    }
  }
  return 'https://calendar.google.com/calendar/u/0/r';
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

/** Cap noisy Brief sections so Security/Finance/Calendar don't drown work context. */
function capBriefingSignals(signals: BriefingSignalDto[]): BriefingSignalDto[] {
  const perSectionLimit: Partial<Record<string, number>> = {
    Security: 2,
    Finance: 2,
    Calendar: 3,
  };
  const counts = new Map<string, number>();
  const kept: BriefingSignalDto[] = [];

  for (const signal of signals) {
    const section = signal.section?.trim() || 'Updates';
    const limit = perSectionLimit[section];
    if (limit != null) {
      const used = counts.get(section) ?? 0;
      if (used >= limit) continue;
      counts.set(section, used + 1);
    }
    kept.push(signal);
    if (kept.length >= 10) break;
  }

  return kept.sort((a, b) => sectionRank(a.section) - sectionRank(b.section));
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
      return 'Calendar';
    default:
      return relevance >= 0.7 ? 'Needs action' : 'Follow up';
  }
}
