import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { WorkspaceIdQueryDto } from '../integrations/dto/connect-integration.dto';
import {
  CreateScheduleItemDto,
  UpdateScheduleItemDto,
} from './dto/schedule.dto';
import { ScheduleService } from './schedule.service';

@ApiTags('workspace')
@Controller('workspace/schedule')
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Today day-plan / schedule items for a workspace' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: Partial<WorkspaceIdQueryDto>,
  ) {
    return this.schedule.list(user, query.workspaceId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a day-plan item' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateScheduleItemDto) {
    return this.schedule.create(user, body);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a day-plan item' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateScheduleItemDto,
  ) {
    return this.schedule.update(user, id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a day-plan item' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: Partial<WorkspaceIdQueryDto>,
  ) {
    await this.schedule.remove(user, id, query.workspaceId);
    return { ok: true };
  }
}
