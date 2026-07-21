import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationChannel,
  type Prisma,
} from '@prisma/client';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import type { HomeBriefDto } from '../briefing/briefing.types';
import { PrismaService } from '../common/prisma/prisma.service';
import { MembershipService } from '../membership/membership.service';
import { WorkspaceService } from '../workspace/workspace.service';

export type NotificationDto = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  channel: NotificationChannel;
  readAt: string | null;
  createdAt: string;
  meta: Record<string, unknown> | null;
};

type AlertCandidate = {
  type: 'deadline' | 'security';
  title: string;
  body: string;
  href: string | null;
  sourceKey: string;
};

type NotificationPrefs = {
  brief?: boolean;
  recs?: boolean;
  meetings?: boolean;
  weekly?: boolean;
  push?: boolean;
  email?: boolean;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly workspaces: WorkspaceService,
  ) {}

  async list(
    user: AuthUser,
    workspaceId?: string,
    opts?: { unreadOnly?: boolean; limit?: number },
  ): Promise<{ items: NotificationDto[]; unreadCount: number }> {
    const wsId = await this.resolveWorkspaceId(user, workspaceId);
    await this.membership.requireMembership(user.id, wsId);

    const limit = Math.min(Math.max(opts?.limit ?? 40, 1), 100);
    const where: Prisma.NotificationWhereInput = {
      userId: user.id,
      workspaceId: wsId,
      channel: NotificationChannel.in_app,
      ...(opts?.unreadOnly ? { readAt: null } : {}),
    };

    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({
        where: {
          userId: user.id,
          workspaceId: wsId,
          channel: NotificationChannel.in_app,
          readAt: null,
        },
      }),
    ]);

    return {
      items: rows.map(toDto),
      unreadCount,
    };
  }

  async markRead(
    user: AuthUser,
    notificationId: string,
    workspaceId?: string,
  ): Promise<NotificationDto> {
    const wsId = await this.resolveWorkspaceId(user, workspaceId);
    await this.membership.requireMembership(user.id, wsId);

    const existing = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: user.id,
        workspaceId: wsId,
      },
    });
    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id: existing.id },
      data: { readAt: existing.readAt ?? new Date() },
    });
    return toDto(updated);
  }

  async markAllRead(user: AuthUser, workspaceId?: string): Promise<{ updated: number }> {
    const wsId = await this.resolveWorkspaceId(user, workspaceId);
    await this.membership.requireMembership(user.id, wsId);

    const result = await this.prisma.notification.updateMany({
      where: {
        userId: user.id,
        workspaceId: wsId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async registerPushToken(
    user: AuthUser,
    input: { token: string; platform: string },
  ): Promise<{ ok: true }> {
    const token = input.token.trim();
    const platform = input.platform.trim().toLowerCase() || 'unknown';
    if (!token || token.length < 8) {
      throw new BadRequestException('Invalid push token');
    }

    await this.prisma.pushDevice.upsert({
      where: {
        userId_token: { userId: user.id, token },
      },
      create: {
        userId: user.id,
        token,
        platform,
        lastSeenAt: new Date(),
      },
      update: {
        platform,
        lastSeenAt: new Date(),
      },
    });
    return { ok: true };
  }

  /**
   * After a brief is composed: create in-app (+ optional push) alerts for
   * deadline and security signals the user has not already been notified about.
   */
  async dispatchFromBrief(input: {
    workspaceId: string;
    userId: string;
    brief?: HomeBriefDto | null;
  }): Promise<{ created: number; pushed: number }> {
    const brief =
      input.brief ??
      (await this.loadTodayBriefPayload(input.workspaceId));
    if (!brief) {
      return { created: 0, pushed: 0 };
    }

    const prefs = await this.loadPrefs(input.userId);
    const candidates = collectAlertCandidates(brief).filter((c) =>
      prefAllows(prefs, c.type),
    );

    let created = 0;
    const pushPayloads: Array<{ title: string; body: string; href: string | null }> =
      [];

    for (const candidate of candidates) {
      const already = await this.hasRecentAlert(
        input.userId,
        input.workspaceId,
        candidate.type,
        candidate.sourceKey,
      );
      if (already) continue;

      await this.prisma.notification.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          channel: NotificationChannel.in_app,
          type: candidate.type,
          title: candidate.title,
          body: candidate.body,
          href: candidate.href,
          meta: {
            sourceKey: candidate.sourceKey,
          },
        },
      });
      created += 1;
      pushPayloads.push({
        title: candidate.title,
        body: candidate.body,
        href: candidate.href,
      });
    }

    let pushed = 0;
    if (pushPayloads.length > 0 && prefs.push !== false) {
      pushed = await this.sendPush(input.userId, pushPayloads);
    }

    this.logger.log(
      {
        workspaceId: input.workspaceId,
        userId: input.userId,
        created,
        pushed,
        candidates: candidates.length,
      },
      'Notification dispatch finished',
    );
    return { created, pushed };
  }

  /** Evening digest: one summary in-app (+ push) for unread alerts. */
  async runDigest(): Promise<{ workspaces: number; sent: number }> {
    const unread = await this.prisma.notification.groupBy({
      by: ['workspaceId', 'userId'],
      where: {
        readAt: null,
        channel: NotificationChannel.in_app,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      _count: { _all: true },
    });

    let sent = 0;
    for (const row of unread) {
      if (row._count._all < 1) continue;
      const prefs = await this.loadPrefs(row.userId);
      if (prefs.weekly === false) continue;

      const title = 'Chief digest';
      const body = `You have ${row._count._all} unread alert${
        row._count._all === 1 ? '' : 's'
      } — deadlines and security items waiting.`;

      const alreadyDigest = await this.hasRecentAlert(
        row.userId,
        row.workspaceId,
        'digest',
        utcDateKey(),
      );
      if (alreadyDigest) continue;

      await this.prisma.notification.create({
        data: {
          workspaceId: row.workspaceId,
          userId: row.userId,
          channel: NotificationChannel.in_app,
          type: 'digest',
          title,
          body,
          href: null,
          meta: { sourceKey: utcDateKey() },
        },
      });

      if (prefs.push !== false) {
        await this.sendPush(row.userId, [{ title, body, href: null }]);
      }
      sent += 1;
    }

    return { workspaces: unread.length, sent };
  }

  private async loadTodayBriefPayload(
    workspaceId: string,
  ): Promise<HomeBriefDto | null> {
    const row = await this.prisma.brief.findUnique({
      where: {
        workspaceId_briefDate: {
          workspaceId,
          briefDate: utcDateOnly(),
        },
      },
    });
    if (!row || !row.payload || typeof row.payload !== 'object') return null;
    const payload = row.payload as HomeBriefDto;
    if (!Array.isArray(payload.focus) || !Array.isArray(payload.briefing)) {
      return null;
    }
    return payload;
  }

  private async hasRecentAlert(
    userId: string,
    workspaceId: string,
    type: string,
    sourceKey: string,
  ): Promise<boolean> {
    const since = new Date(Date.now() - 20 * 60 * 60 * 1000);
    const recent = await this.prisma.notification.findMany({
      where: {
        userId,
        workspaceId,
        type,
        createdAt: { gte: since },
      },
      select: { meta: true },
      take: 40,
    });
    return recent.some((row) => {
      const meta = row.meta as { sourceKey?: string } | null;
      return meta?.sourceKey === sourceKey;
    });
  }

  private async loadPrefs(userId: string): Promise<NotificationPrefs> {
    const pref = await this.prisma.userPreference.findUnique({
      where: { userId },
      select: { notificationPrefs: true },
    });
    if (!pref?.notificationPrefs || typeof pref.notificationPrefs !== 'object') {
      return {};
    }
    return pref.notificationPrefs as NotificationPrefs;
  }

  private async sendPush(
    userId: string,
    messages: Array<{ title: string; body: string; href: string | null }>,
  ): Promise<number> {
    const devices = await this.prisma.pushDevice.findMany({
      where: { userId },
      select: { token: true, id: true },
    });
    if (devices.length === 0) return 0;

    const payload = devices.flatMap((device) =>
      messages.map((msg) => ({
        to: device.token,
        sound: 'default' as const,
        title: msg.title,
        body: msg.body,
        data: msg.href ? { href: msg.href } : {},
      })),
    );

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        this.logger.warn(
          { status: response.status, userId },
          'Expo push send failed',
        );
        return 0;
      }
      return messages.length;
    } catch (error) {
      this.logger.warn(
        {
          userId,
          err: error instanceof Error ? error.message : String(error),
        },
        'Expo push request errored',
      );
      return 0;
    }
  }

  private async resolveWorkspaceId(user: AuthUser, workspaceId?: string) {
    const trimmed = workspaceId?.trim();
    if (trimmed) return trimmed;
    const primary = await this.workspaces.ensureDefaultWorkspace(user);
    return primary.id;
  }
}

function collectAlertCandidates(brief: HomeBriefDto): AlertCandidate[] {
  const out: AlertCandidate[] = [];

  for (const item of brief.focus) {
    const type = alertTypeFromFocus(item);
    if (!type) continue;
    out.push({
      type,
      title: item.title,
      body: item.reason || item.aboutBody || item.aiRecommendation,
      href: `/focus/${item.id}`,
      sourceKey: item.id,
    });
  }

  for (const signal of brief.briefing) {
    if (signal.section === 'Security') {
      out.push({
        type: 'security',
        title: signal.title,
        body: signal.summary,
        href: null,
        sourceKey: signal.id.startsWith('mail-') ? signal.id : `mail-${signal.id}`,
      });
      continue;
    }
    if (
      signal.section === 'Needs Attention' &&
      /\b(due|deadline|overdue|today|tomorrow)\b/i.test(
        `${signal.title} ${signal.summary}`,
      )
    ) {
      out.push({
        type: 'deadline',
        title: signal.title,
        body: signal.summary,
        href: null,
        sourceKey: signal.id,
      });
    }
  }

  return out;
}

function alertTypeFromFocus(item: {
  urgencyLabel: string;
  aboutTitle?: string;
  title: string;
  reason: string;
}): 'deadline' | 'security' | null {
  const blob = `${item.urgencyLabel} ${item.aboutTitle ?? ''} ${item.title} ${item.reason}`;
  if (/security/i.test(blob)) return 'security';
  if (/deadline/i.test(blob) || /due\b/i.test(item.urgencyLabel)) return 'deadline';
  return null;
}

function prefAllows(prefs: NotificationPrefs, type: 'deadline' | 'security'): boolean {
  if (type === 'security') return true;
  // Deadlines map to Daily Brief / Meeting Reminders toggles (default on).
  if (prefs.brief === false && prefs.meetings === false) return false;
  return true;
}

function toDto(row: {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  channel: NotificationChannel;
  readAt: Date | null;
  createdAt: Date;
  meta: Prisma.JsonValue | null;
}): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    channel: row.channel,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    meta:
      row.meta && typeof row.meta === 'object' && !Array.isArray(row.meta)
        ? (row.meta as Record<string, unknown>)
        : null,
  };
}

function utcDateOnly(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function utcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
