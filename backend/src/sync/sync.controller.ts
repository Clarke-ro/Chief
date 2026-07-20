import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SyncResource } from '@prisma/client';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { SyncService } from './sync.service';

class WorkspaceQueryDto {
  @IsString()
  @MinLength(8)
  workspaceId!: string;
}

class ManualBodyDto {
  @IsString()
  @MinLength(8)
  workspaceId!: string;

  @IsOptional()
  @IsString()
  resource?: string;
}

class HistoricalBodyDto {
  @IsString()
  @MinLength(8)
  workspaceId!: string;

  @IsInt()
  @Min(1)
  @Max(365)
  lookbackDays!: number;

  @IsOptional()
  @IsString()
  resource?: string;
}

@ApiTags('sync')
@ApiBearerAuth()
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Get('accounts/:connectedAccountId')
  @ApiOperation({ summary: 'Sync state for a connected account' })
  status(
    @CurrentUser() user: AuthUser,
    @Param('connectedAccountId') connectedAccountId: string,
    @Query() query: WorkspaceQueryDto,
  ) {
    return this.sync.getStatus(user, connectedAccountId, query.workspaceId);
  }

  @Post('accounts/:connectedAccountId/run')
  @ApiOperation({ summary: 'Manual sync (bounded / incremental)' })
  run(
    @CurrentUser() user: AuthUser,
    @Param('connectedAccountId') connectedAccountId: string,
    @Body() body: ManualBodyDto,
  ) {
    return this.sync.triggerManual(
      user,
      connectedAccountId,
      body.workspaceId,
      parseResource(body.resource),
    );
  }

  @Post('accounts/:connectedAccountId/historical')
  @ApiOperation({ summary: 'Explicit historical import (requires lookbackDays)' })
  historical(
    @CurrentUser() user: AuthUser,
    @Param('connectedAccountId') connectedAccountId: string,
    @Body() body: HistoricalBodyDto,
  ) {
    return this.sync.triggerHistorical(
      user,
      connectedAccountId,
      body.workspaceId,
      body.lookbackDays,
      parseResource(body.resource),
    );
  }

  @Post('accounts/:connectedAccountId/recover')
  @ApiOperation({ summary: 'Recovery sync after failure / reauth' })
  recover(
    @CurrentUser() user: AuthUser,
    @Param('connectedAccountId') connectedAccountId: string,
    @Body() body: WorkspaceQueryDto,
  ) {
    return this.sync.triggerRecovery(user, connectedAccountId, body.workspaceId);
  }
}

function parseResource(value?: string): SyncResource | undefined {
  if (!value) return undefined;
  if (Object.values(SyncResource).includes(value as SyncResource)) {
    return value as SyncResource;
  }
  throw new BadRequestException(`Invalid resource: ${value}`);
}
