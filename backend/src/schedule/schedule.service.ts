import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ScheduleBlockKind,
  ScheduleItemStatus,
  SweepPhase,
  type ScheduleItem,
} from '@prisma/client';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { MembershipService } from '../membership/membership.service';
import { WorkspaceService } from '../workspace/workspace.service';
import type { CreateScheduleItemDto, UpdateScheduleItemDto } from './dto/schedule.dto';

const PLATFORMS = new Set([
  'gmail',
  'calendar',
  'slack',
  'github',
  'notion',
  'asana',
  'trello',
]);

export type ScheduleItemDto = {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  platform: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  duration?: string;
  attendees?: number;
  blockKind?: 'normal' | 'major';
  focusId?: string;
  sweepPhase?: 'none' | 'checking' | 'cleared' | 'still_open';
  lastSweepAt?: number;
};

type CalendarScheduleMeta = {
  source: 'calendar';
  eventId: string;
};

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly workspaces: WorkspaceService,
  ) {}

  async list(user: AuthUser, workspaceId?: string): Promise<ScheduleItemDto[]> {
    const wsId = await this.resolveWorkspaceId(user, workspaceId);
    await this.membership.requireMembership(user.id, wsId);

    await this.syncTodayFromCalendar(wsId);

    const rows = await this.prisma.scheduleItem.findMany({
      where: { workspaceId: wsId },
      orderBy: [{ startsAt: 'asc' }, { timeLabel: 'asc' }, { createdAt: 'asc' }],
    });

    return rows.map(toDto);
  }

  async create(
    user: AuthUser,
    body: CreateScheduleItemDto,
  ): Promise<ScheduleItemDto> {
    const wsId = await this.resolveWorkspaceId(user, body.workspaceId);
    await this.membership.requireMembership(user.id, wsId);

    const row = await this.prisma.scheduleItem.create({
      data: {
        workspaceId: wsId,
        title: body.title.trim(),
        subtitle: body.subtitle?.trim() || '',
        platform: mapPlatform(body.platform),
        timeLabel: body.time.trim(),
        status: (body.status as ScheduleItemStatus) ?? ScheduleItemStatus.upcoming,
        duration: body.duration?.trim() || null,
        attendees: body.attendees ?? null,
        blockKind:
          body.blockKind === 'major'
            ? ScheduleBlockKind.major
            : ScheduleBlockKind.normal,
        focusId: body.focusId?.trim() || null,
        sweepPhase: SweepPhase.none,
      },
    });

    return toDto(row);
  }

  async update(
    user: AuthUser,
    id: string,
    body: UpdateScheduleItemDto,
  ): Promise<ScheduleItemDto> {
    const existing = await this.requireItem(user, id, body.workspaceId);

    const row = await this.prisma.scheduleItem.update({
      where: { id: existing.id },
      data: {
        ...(body.title != null ? { title: body.title.trim() } : {}),
        ...(body.subtitle != null ? { subtitle: body.subtitle.trim() } : {}),
        ...(body.platform != null ? { platform: mapPlatform(body.platform) } : {}),
        ...(body.time != null ? { timeLabel: body.time.trim() } : {}),
        ...(body.status != null
          ? { status: body.status as ScheduleItemStatus }
          : {}),
        ...(body.duration !== undefined
          ? { duration: body.duration?.trim() || null }
          : {}),
        ...(body.attendees !== undefined ? { attendees: body.attendees } : {}),
        ...(body.blockKind != null
          ? {
              blockKind:
                body.blockKind === 'major'
                  ? ScheduleBlockKind.major
                  : ScheduleBlockKind.normal,
            }
          : {}),
        ...(body.focusId !== undefined
          ? { focusId: body.focusId?.trim() || null }
          : {}),
        ...(body.sweepPhase != null
          ? { sweepPhase: body.sweepPhase as SweepPhase }
          : {}),
        ...(body.lastSweepAt !== undefined
          ? {
              lastSweepAt:
                body.lastSweepAt == null ? null : new Date(body.lastSweepAt),
            }
          : {}),
      },
    });

    return toDto(row);
  }

  async remove(user: AuthUser, id: string, workspaceId?: string): Promise<void> {
    const existing = await this.requireItem(user, id, workspaceId);
    await this.prisma.scheduleItem.delete({ where: { id: existing.id } });
  }

  private async requireItem(user: AuthUser, id: string, workspaceId?: string) {
    const wsId = await this.resolveWorkspaceId(user, workspaceId);
    await this.membership.requireMembership(user.id, wsId);
    const row = await this.prisma.scheduleItem.findFirst({
      where: { id, workspaceId: wsId },
    });
    if (!row) throw new NotFoundException('Schedule item not found.');
    return row;
  }

  private async resolveWorkspaceId(user: AuthUser, workspaceId?: string) {
    if (workspaceId?.trim()) return workspaceId.trim();
    return (await this.workspaces.ensureDefaultWorkspace(user)).id;
  }

  /**
   * Keep Today's Schedule aligned with calendar events for the local day.
   * Upserts by event id; leaves manually created schedule rows alone.
   */
  private async syncTodayFromCalendar(workspaceId: string): Promise<void> {
    const start = startOfLocalDay(new Date());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const [events, existing] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where: {
          workspaceId,
          startsAt: { gte: start, lt: end },
          NOT: { status: 'cancelled' },
        },
        orderBy: { startsAt: 'asc' },
        take: 40,
      }),
      this.prisma.scheduleItem.findMany({
        where: {
          workspaceId,
          OR: [
            { startsAt: { gte: start, lt: end } },
            { startsAt: null, createdAt: { gte: start, lt: end } },
          ],
        },
      }),
    ]);

    const byEventId = new Map<string, ScheduleItem>();
    for (const row of existing) {
      const eventId = calendarEventIdFromMeta(row.meta);
      if (eventId) byEventId.set(eventId, row);
    }

    const seen = new Set<string>();
    for (const event of events) {
      seen.add(event.id);
      const title = event.title.trim() || 'Calendar event';
      const subtitle = event.location?.trim() || 'Calendar';
      const timeLabel = formatClockTime(event.startsAt);
      const meta: CalendarScheduleMeta = {
        source: 'calendar',
        eventId: event.id,
      };
      const prev = byEventId.get(event.id);
      if (prev) {
        await this.prisma.scheduleItem.update({
          where: { id: prev.id },
          data: {
            title,
            subtitle,
            timeLabel,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            platform: 'calendar',
            meta,
          },
        });
      } else {
        await this.prisma.scheduleItem.create({
          data: {
            workspaceId,
            title,
            subtitle,
            platform: 'calendar',
            timeLabel,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            status: ScheduleItemStatus.upcoming,
            blockKind: ScheduleBlockKind.normal,
            sweepPhase: SweepPhase.none,
            meta,
          },
        });
      }
    }

    for (const [eventId, row] of byEventId) {
      if (seen.has(eventId)) continue;
      await this.prisma.scheduleItem.delete({ where: { id: row.id } });
    }
  }
}

function calendarEventIdFromMeta(meta: unknown): string | null {
  if (!meta || typeof meta !== 'object') return null;
  const record = meta as { source?: unknown; eventId?: unknown };
  if (record.source !== 'calendar') return null;
  if (typeof record.eventId !== 'string' || !record.eventId.trim()) return null;
  return record.eventId.trim();
}

function toDto(row: ScheduleItem): ScheduleItemDto {
  return {
    id: row.id,
    time: row.timeLabel,
    title: row.title,
    subtitle: row.subtitle,
    platform: mapPlatform(row.platform),
    status: row.status,
    duration: row.duration ?? undefined,
    attendees: row.attendees ?? undefined,
    blockKind: row.blockKind,
    focusId: row.focusId ?? undefined,
    sweepPhase: row.sweepPhase,
    lastSweepAt: row.lastSweepAt?.getTime(),
  };
}

function mapPlatform(value: string): string {
  const key = value.trim().toLowerCase();
  return PLATFORMS.has(key) ? key : 'calendar';
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function formatClockTime(date: Date): string {
  let hour = date.getHours();
  const minute = date.getMinutes();
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute.toString().padStart(2, '0')} ${meridiem}`;
}
