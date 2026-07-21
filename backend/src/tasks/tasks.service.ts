import { Injectable, NotFoundException } from '@nestjs/common';
import {
  TaskPriority,
  TaskSection,
  TaskStatus,
  type Task,
} from '@prisma/client';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { MembershipService } from '../membership/membership.service';
import { WorkspaceService } from '../workspace/workspace.service';
import type { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

const PLATFORMS = new Set([
  'gmail',
  'calendar',
  'slack',
  'github',
  'notion',
  'asana',
  'trello',
]);

export type TaskDto = {
  id: string;
  title: string;
  description: string;
  details: string;
  platform: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  estimatedMinutes: number;
  confidence?: number;
  status: 'ready' | 'in_progress' | 'waiting' | 'done';
  section: 'today' | 'upcoming' | 'waiting' | 'completed';
  dueLabel: string;
};

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly workspaces: WorkspaceService,
  ) {}

  async list(
    user: AuthUser,
    workspaceId?: string,
    section?: string,
  ): Promise<TaskDto[]> {
    const wsId = await this.resolveWorkspaceId(user, workspaceId);
    await this.membership.requireMembership(user.id, wsId);

    const rows = await this.prisma.task.findMany({
      where: {
        workspaceId: wsId,
        ...(section && isSection(section)
          ? { section: section as TaskSection }
          : {}),
      },
      orderBy: [{ section: 'asc' }, { priority: 'asc' }, { dueAt: 'asc' }],
      take: 100,
    });

    return rows.map(toDto);
  }

  async getById(
    user: AuthUser,
    id: string,
    workspaceId?: string,
  ): Promise<TaskDto> {
    const row = await this.requireTask(user, id, workspaceId);
    return toDto(row);
  }

  async create(user: AuthUser, body: CreateTaskDto): Promise<TaskDto> {
    const wsId = await this.resolveWorkspaceId(user, body.workspaceId);
    await this.membership.requireMembership(user.id, wsId);

    const status = (body.status as TaskStatus) ?? TaskStatus.ready;
    const section =
      (body.section as TaskSection) ??
      (status === TaskStatus.done
        ? TaskSection.completed
        : status === TaskStatus.waiting
          ? TaskSection.waiting
          : TaskSection.today);

    const estimatedMinutes = body.estimatedMinutes ?? 15;
    const row = await this.prisma.task.create({
      data: {
        workspaceId: wsId,
        userId: user.id,
        title: body.title.trim(),
        description: body.description?.trim() || '',
        details: body.details?.trim() || '',
        platform: mapPlatform(body.platform ?? 'asana'),
        priority: (body.priority as TaskPriority) ?? TaskPriority.medium,
        status,
        section,
        estimatedTime: body.estimatedTime?.trim() || `${estimatedMinutes} min`,
        estimatedMinutes,
        dueLabel: body.dueLabel?.trim() || 'Today',
        meta: { source: 'chief.user' },
      },
    });

    return toDto(row);
  }

  async update(
    user: AuthUser,
    id: string,
    body: UpdateTaskDto,
  ): Promise<TaskDto> {
    const existing = await this.requireTask(user, id, body.workspaceId);

    const nextStatus =
      body.status != null ? (body.status as TaskStatus) : existing.status;
    const nextSection =
      body.section != null
        ? (body.section as TaskSection)
        : nextStatus === TaskStatus.done
          ? TaskSection.completed
          : existing.section;

    const row = await this.prisma.task.update({
      where: { id: existing.id },
      data: {
        ...(body.title != null ? { title: body.title.trim() } : {}),
        ...(body.description != null
          ? { description: body.description.trim() }
          : {}),
        ...(body.details != null ? { details: body.details.trim() } : {}),
        ...(body.platform != null
          ? { platform: mapPlatform(body.platform) }
          : {}),
        ...(body.priority != null
          ? { priority: body.priority as TaskPriority }
          : {}),
        status: nextStatus,
        section: nextSection,
        ...(body.estimatedTime != null
          ? { estimatedTime: body.estimatedTime.trim() }
          : {}),
        ...(body.estimatedMinutes != null
          ? { estimatedMinutes: body.estimatedMinutes }
          : {}),
        ...(body.confidence != null ? { confidence: body.confidence } : {}),
        ...(body.dueLabel != null ? { dueLabel: body.dueLabel.trim() } : {}),
        completedAt:
          nextStatus === TaskStatus.done
            ? (existing.completedAt ?? new Date())
            : null,
      },
    });

    return toDto(row);
  }

  async complete(
    user: AuthUser,
    id: string,
    workspaceId?: string,
  ): Promise<TaskDto> {
    return this.update(user, id, {
      workspaceId,
      status: 'done',
      section: 'completed',
    });
  }

  async remove(user: AuthUser, id: string, workspaceId?: string): Promise<void> {
    const existing = await this.requireTask(user, id, workspaceId);
    await this.prisma.task.delete({ where: { id: existing.id } });
  }

  private async requireTask(user: AuthUser, id: string, workspaceId?: string) {
    const wsId = await this.resolveWorkspaceId(user, workspaceId);
    await this.membership.requireMembership(user.id, wsId);
    const row = await this.prisma.task.findFirst({
      where: { id, workspaceId: wsId },
    });
    if (!row) throw new NotFoundException('Task not found.');
    return row;
  }

  private async resolveWorkspaceId(user: AuthUser, workspaceId?: string) {
    if (workspaceId?.trim()) return workspaceId.trim();
    return (await this.workspaces.ensureDefaultWorkspace(user)).id;
  }
}

function toDto(row: Task): TaskDto {
  const minutes =
    row.estimatedMinutes ??
    (row.estimatedTime ? parseInt(row.estimatedTime, 10) || 15 : 15);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    details: row.details,
    platform: mapPlatform(row.platform),
    priority: row.priority,
    estimatedTime: row.estimatedTime?.trim() || `${minutes} min`,
    estimatedMinutes: minutes,
    confidence: row.confidence ?? undefined,
    status: row.status,
    section: row.section,
    dueLabel: row.dueLabel?.trim() || 'When ready',
  };
}

function mapPlatform(value: string): string {
  const key = value.trim().toLowerCase();
  return PLATFORMS.has(key) ? key : 'asana';
}

function isSection(value: string): value is TaskSection {
  return ['today', 'upcoming', 'waiting', 'completed'].includes(value);
}
