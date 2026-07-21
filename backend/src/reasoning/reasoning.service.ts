import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { OpenAiService } from '../ai/openai.service';
import { ContextEngineService } from '../context/context-engine.service';
import { PromptService } from '../prompt/prompt.service';

export type ChiefChatHistoryTurn = {
  role: 'user' | 'chief';
  content: string;
};

export type ChiefChatResult = {
  content: string;
  model: string;
  workspaceId: string;
};

/**
 * Reasoning layer — assemble context, prompt, and model call.
 * Keeps controllers thin and ensures only structured context reaches the LLM.
 */
@Injectable()
export class ReasoningService {
  constructor(
    private readonly contextEngine: ContextEngineService,
    private readonly prompts: PromptService,
    private readonly openai: OpenAiService,
  ) {}

  async chat(
    user: AuthUser,
    input: {
      message: string;
      workspaceId?: string;
      history?: ChiefChatHistoryTurn[];
      focusId?: string;
    },
  ): Promise<ChiefChatResult> {
    const { workspaceId, context } = await this.contextEngine.buildForUser(
      user,
      input.workspaceId,
    );

    const history = (input.history ?? [])
      .filter((turn) => turn.content.trim())
      .slice(-8)
      .map((turn) => ({
        role: turn.role,
        content: turn.content.trim().slice(0, 1200),
      }));

    // Variable payload last — stable system instructions stay in `instructions`.
    const userPayload = JSON.stringify({
      question: input.message.trim(),
      focusId: input.focusId?.trim() || undefined,
      recentTurns: history,
      workspaceContext: context,
    });

    const content = await this.openai.completeChiefReply({
      instructions: this.prompts.getChiefSystemPrompt(),
      userPayload,
    });

    return {
      content,
      model: this.configAiModel(),
      workspaceId,
    };
  }

  private configAiModel(): string {
    return this.openai.isConfigured() ? 'openai' : 'mock';
  }
}
