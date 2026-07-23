import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { WorkspaceEngineService } from '../workspace-engine/workspace-engine.service';
import type { WorkspaceContextPayload } from './workspace-context.types';

/**
 * Context Engine — thin facade over Workspace Engine for model-ready snapshots.
 * Ask Chief path: Knowledge → Workspace understanding → (Planner in Reasoning).
 */
@Injectable()
export class ContextEngineService {
  constructor(private readonly workspaceEngine: WorkspaceEngineService) {}

  async buildForUser(
    user: AuthUser,
    workspaceId?: string,
  ): Promise<{ workspaceId: string; context: WorkspaceContextPayload }> {
    const understanding = await this.workspaceEngine.buildUnderstanding(
      user,
      workspaceId,
    );
    return {
      workspaceId: understanding.workspaceId,
      context: understanding.context,
    };
  }
}
