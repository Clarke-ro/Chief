import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

class ListNotificationsQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  workspaceId?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  unreadOnly?: boolean;
}

class WorkspaceBodyDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  workspaceId?: string;
}

class RegisterPushBodyDto {
  @IsString()
  @MinLength(8)
  token!: string;

  @IsString()
  @MinLength(2)
  platform!: string;
}

@ApiTags('workspace')
@ApiBearerAuth()
@Controller('workspace/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List in-app notifications for the workspace' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: Partial<ListNotificationsQueryDto>,
  ) {
    return this.notifications.list(user, query.workspaceId, {
      unreadOnly: query.unreadOnly === true,
    });
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all workspace notifications as read' })
  markAllRead(@CurrentUser() user: AuthUser, @Body() body: WorkspaceBodyDto) {
    return this.notifications.markAllRead(user, body.workspaceId);
  }

  @Post('push-token')
  @ApiOperation({ summary: 'Register an Expo push token for this user' })
  registerPush(
    @CurrentUser() user: AuthUser,
    @Body() body: RegisterPushBodyDto,
  ) {
    return this.notifications.registerPushToken(user, body);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: WorkspaceBodyDto,
  ) {
    return this.notifications.markRead(user, id, body.workspaceId);
  }
}
