import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { ReasoningService } from '../reasoning/reasoning.service';
import { ChiefChatBodyDto } from './dto/chief-chat.dto';

@ApiTags('chief')
@Controller('chief')
export class ConversationsController {
  constructor(private readonly reasoning: ReasoningService) {}

  @Post('chat')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Ask Chief using live workspace context (structured, not full inbox)',
  })
  async chat(@CurrentUser() user: AuthUser, @Body() body: ChiefChatBodyDto) {
    const result = await this.reasoning.chat(user, {
      message: body.message,
      workspaceId: body.workspaceId,
      focusId: body.focusId,
      history: body.history,
    });

    return {
      content: result.content,
      workspaceId: result.workspaceId,
      provider: result.provider,
      model: result.model,
    };
  }

  @Post('chat/stream')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Ask Chief with NDJSON token stream (same pipeline as /chat; additive)',
  })
  async chatStream(
    @CurrentUser() user: AuthUser,
    @Body() body: ChiefChatBodyDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      for await (const event of this.reasoning.chatStream(user, {
        message: body.message,
        workspaceId: body.workspaceId,
        focusId: body.focusId,
        history: body.history,
      })) {
        res.write(`${JSON.stringify(event)}\n`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Chief stream failed.';
      res.write(
        `${JSON.stringify({ type: 'error', message })}\n`,
      );
    } finally {
      res.end();
    }
  }
}
