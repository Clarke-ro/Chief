import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { WorkspaceIdQueryDto } from '../integrations/dto/connect-integration.dto';
import { BriefingService } from './briefing.service';

class CompleteFocusBodyDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  workspaceId?: string;
}

@ApiTags('workspace')
@Controller('workspace')
export class BriefingController {
  constructor(private readonly briefing: BriefingService) {}

  @Get('brief')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Home brief for a workspace (focus + briefing signals)',
  })
  getBrief(
    @CurrentUser() user: AuthUser,
    @Query() query: Partial<WorkspaceIdQueryDto>,
  ) {
    return this.briefing.getHomeBrief(user, query.workspaceId);
  }

  @Post('focus/:sourceKey/complete')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mark a Top Priority item done (kept in history, not resurfaced)',
  })
  completeFocus(
    @CurrentUser() user: AuthUser,
    @Param('sourceKey') sourceKey: string,
    @Body() body: CompleteFocusBodyDto,
  ) {
    return this.briefing.completeFocusItem(user, sourceKey, body.workspaceId);
  }
}
