import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { AppConfigService } from '../common/config/app-config.service';
import { ReasoningService } from '../reasoning/reasoning.service';
import { ChiefChatBodyDto } from './dto/chief-chat.dto';

@ApiTags('chief')
@Controller('chief')
export class ConversationsController {
  constructor(
    private readonly reasoning: ReasoningService,
    private readonly config: AppConfigService,
  ) {}

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
      provider: this.config.ai.provider,
      model: this.config.ai.model,
    };
  }
}
