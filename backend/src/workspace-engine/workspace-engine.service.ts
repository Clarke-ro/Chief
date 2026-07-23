import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { BriefingService } from '../briefing/briefing.service';
import type { WorkspaceContextPayload } from '../context/workspace-context.types';
import {
  clipKnowledge,
  KnowledgeEngineService,
} from '../knowledge/knowledge-engine.service';
import { MembershipService } from '../membership/membership.service';
import { WorkspaceService } from '../workspace/workspace.service';
import type { WorkspaceUnderstanding } from './workspace-engine.types';

const DEADLINE_LIMIT = 8;

/**
 * Workspace Engine — merges rule-based Home brief + Knowledge Engine into one
 * understanding for Ask Chief. Does not call the LLM.
 */
@Injectable()
export class WorkspaceEngineService {
  constructor(
    private readonly knowledge: KnowledgeEngineService,
    private readonly briefing: BriefingService,
    private readonly membership: MembershipService,
    private readonly workspaces: WorkspaceService,
  ) {}

  async buildUnderstanding(
    user: AuthUser,
    workspaceId?: string,
  ): Promise<WorkspaceUnderstanding> {
    const wsId = workspaceId?.trim()
      ? workspaceId.trim()
      : (await this.workspaces.ensureDefaultWorkspace(user)).id;
    await this.membership.requireMembership(user.id, wsId);

    const [brief, knowledge] = await Promise.all([
      this.briefing.getHomeBrief(user, wsId),
      this.knowledge.loadSnapshot(wsId),
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
      ...knowledge.tasks
        .filter((task) => task.dueAt != null || Boolean(task.dueLabel?.trim()))
        .slice(0, DEADLINE_LIMIT)
        .map((task) => ({
          id: task.id,
          title: task.title,
          dueAt: task.dueAt,
          dueLabel: task.dueLabel,
          priority: task.priority,
        })),
      ...brief.focus
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
    ].slice(0, DEADLINE_LIMIT);

    const context: WorkspaceContextPayload = {
      brief: clipKnowledge(`${brief.successLabel}. ${brief.successInsight}`, 280),
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

    const openDeadlineCount = deadlines.filter((d) => {
      const dueAt = 'dueAt' in d ? d.dueAt : undefined;
      if (!dueAt) return Boolean(d.dueLabel);
      return new Date(dueAt).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000;
    }).length;

    return {
      workspaceId: wsId,
      context,
      knowledge,
      understanding: {
        focusCount: priorities.length,
        meetingCount: knowledge.meetings.length,
        openDeadlineCount,
        unreadEmailCount: knowledge.recentEmails.filter((e) => e.isUnread).length,
        openTaskCount: knowledge.tasks.length,
        successLabel: brief.successLabel,
      },
    };
  }
}
