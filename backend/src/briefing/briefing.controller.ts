import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { WorkspaceIdQueryDto } from '../integrations/dto/connect-integration.dto';
import { BriefingService } from './briefing.service';

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
}
