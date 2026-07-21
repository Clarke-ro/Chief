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
import { IsOptional, IsString, MinLength } from 'class-validator';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { WorkspaceIdQueryDto } from '../integrations/dto/connect-integration.dto';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { TasksService } from './tasks.service';

class ListTasksQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  workspaceId?: string;

  @IsOptional()
  @IsString()
  section?: string;
}


class OptionalWorkspaceBodyDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;
}

@ApiTags('workspace')
@Controller('workspace/tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List workspace tasks (synced + user-created)' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: Partial<ListTasksQueryDto>,
  ) {
    return this.tasks.list(user, query.workspaceId, query.section);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single task' })
  getById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: Partial<WorkspaceIdQueryDto>,
  ) {
    return this.tasks.getById(user, id, query.workspaceId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a user-owned task' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateTaskDto) {
    return this.tasks.create(user, body);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a task' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateTaskDto,
  ) {
    return this.tasks.update(user, id, body);
  }

  @Post(':id/complete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a task done' })
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: OptionalWorkspaceBodyDto,
  ) {
    return this.tasks.complete(user, id, body.workspaceId);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a task' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: Partial<WorkspaceIdQueryDto>,
  ) {
    await this.tasks.remove(user, id, query.workspaceId);
    return { ok: true };
  }
}
