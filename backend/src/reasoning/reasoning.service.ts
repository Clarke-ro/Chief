import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { OpenAiService } from '../ai/openai.service';
import { PlannerService } from '../planner/planner.service';
import { PromptService } from '../prompt/prompt.service';
import { WorkspaceEngineService } from '../workspace-engine/workspace-engine.service';

export type ChiefChatHistoryTurn = {
  role: 'user' | 'chief';
  content: string;
};

export type ChiefChatResult = {
  content: string;
  provider: string;
  model: string;
  workspaceId: string;
};

export type ChiefChatStreamEvent =
  | { type: 'delta'; text: string }
  | {
      type: 'done';
      content: string;
      workspaceId: string;
      provider: string;
      model: string;
    };

/**
 * Reasoning layer — Knowledge/Workspace → Planner → LLM.
 * Keeps controllers thin; only structured context + plan reach the model.
 */
@Injectable()
export class ReasoningService {
  constructor(
    private readonly workspaceEngine: WorkspaceEngineService,
    private readonly planner: PlannerService,
    private readonly prompts: PromptService,
    private readonly openai: OpenAiService,
  ) {}

  private buildUserPayload(input: {
    message: string;
    history?: ChiefChatHistoryTurn[];
    focusId?: string;
    workspaceContext: unknown;
    plan: unknown;
  }): string {
    const history = (input.history ?? [])
      .filter((turn) => turn.content.trim())
      .slice(-8)
      .map((turn) => ({
        role: turn.role,
        content: turn.content.trim().slice(0, 1200),
      }));

    // Variable payload last — stable system instructions stay in `instructions`.
    return JSON.stringify({
      question: input.message.trim(),
      focusId: input.focusId?.trim() || undefined,
      recentTurns: history,
      workspaceContext: input.workspaceContext,
      plan: input.plan,
    });
  }

  async chat(
    user: AuthUser,
    input: {
      message: string;
      workspaceId?: string;
      history?: ChiefChatHistoryTurn[];
      focusId?: string;
    },
  ): Promise<ChiefChatResult> {
    const understanding = await this.workspaceEngine.buildUnderstanding(
      user,
      input.workspaceId,
    );
    const plan = this.planner.plan(understanding);
    const userPayload = this.buildUserPayload({
      message: input.message,
      history: input.history,
      focusId: input.focusId,
      workspaceContext: understanding.context,
      plan,
    });

    const reply = await this.openai.completeChiefReply({
      instructions: this.prompts.getChiefSystemPrompt(),
      userPayload,
    });

    return {
      content: reply.content,
      provider: reply.provider,
      model: reply.model,
      workspaceId: understanding.workspaceId,
    };
  }

  /**
   * Same pipeline as chat, then stream token deltas (NDJSON events).
   * Falls back to a single delta + done if streaming is unavailable.
   */
  async *chatStream(
    user: AuthUser,
    input: {
      message: string;
      workspaceId?: string;
      history?: ChiefChatHistoryTurn[];
      focusId?: string;
    },
  ): AsyncGenerator<ChiefChatStreamEvent> {
    const understanding = await this.workspaceEngine.buildUnderstanding(
      user,
      input.workspaceId,
    );
    const plan = this.planner.plan(understanding);
    const userPayload = this.buildUserPayload({
      message: input.message,
      history: input.history,
      focusId: input.focusId,
      workspaceContext: understanding.context,
      plan,
    });

    const instructions = this.prompts.getChiefSystemPrompt();
    let content = '';
    let provider = 'openai';
    let model = '';

    try {
      for await (const event of this.openai.streamChiefReply({
        instructions,
        userPayload,
      })) {
        if (event.type === 'delta') {
          content += event.text;
          yield { type: 'delta', text: event.text };
        } else if (event.type === 'done') {
          content = event.content || content;
          provider = event.provider;
          model = event.model;
        }
      }
    } catch {
      if (!content.trim()) {
        const reply = await this.openai.completeChiefReply({
          instructions,
          userPayload,
        });
        content = reply.content;
        provider = reply.provider;
        model = reply.model;
        if (content) {
          yield { type: 'delta', text: content };
        }
      }
    }

    yield {
      type: 'done',
      content: content.trim(),
      workspaceId: understanding.workspaceId,
      provider,
      model,
    };
  }
}
