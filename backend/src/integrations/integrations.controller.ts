import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { ConnectIntegrationDto } from './dto/connect-integration.dto';
import { IntegrationsService } from './integrations.service';

@ApiTags('integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get('providers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List integration providers and scopes' })
  listProviders() {
    return this.integrations.listProviders();
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Provider catalog + workspace connections' })
  @ApiQuery({ name: 'workspaceId', required: false })
  list(
    @CurrentUser() user: AuthUser,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.integrations.listCatalogAndConnections(user, workspaceId);
  }

  @Post(':provider/connect')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start OAuth connect; returns authorizeUrl' })
  connect(
    @CurrentUser() user: AuthUser,
    @Param('provider') provider: string,
    @Body() body: ConnectIntegrationDto,
  ) {
    return this.integrations.connect(user, provider, body.workspaceId);
  }

  @Get('oauth/:provider/callback')
  @Public()
  @ApiOperation({ summary: 'OAuth provider callback (redirect)' })
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res() res: Response,
  ) {
    const { redirectUrl } = await this.integrations.handleOAuthCallback(
      provider,
      {
        code,
        state,
        error,
        error_description: errorDescription,
      },
    );
    return res.redirect(302, redirectUrl);
  }

  @Get(':connectedAccountId/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Connection status' })
  @ApiQuery({ name: 'workspaceId', required: true })
  status(
    @CurrentUser() user: AuthUser,
    @Param('connectedAccountId') connectedAccountId: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.integrations.getStatus(user, connectedAccountId, workspaceId);
  }

  @Get(':connectedAccountId/health')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Live integration health check' })
  @ApiQuery({ name: 'workspaceId', required: true })
  health(
    @CurrentUser() user: AuthUser,
    @Param('connectedAccountId') connectedAccountId: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.integrations.checkHealth(
      user,
      connectedAccountId,
      workspaceId,
    );
  }

  @Post(':connectedAccountId/reconnect')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start reconnect OAuth for expired tokens' })
  reconnect(
    @CurrentUser() user: AuthUser,
    @Param('connectedAccountId') connectedAccountId: string,
    @Body() body: ConnectIntegrationDto,
  ) {
    return this.integrations.reconnect(
      user,
      connectedAccountId,
      body.workspaceId,
    );
  }

  @Delete(':connectedAccountId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect and revoke provider tokens' })
  @ApiQuery({ name: 'workspaceId', required: true })
  disconnect(
    @CurrentUser() user: AuthUser,
    @Param('connectedAccountId') connectedAccountId: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.integrations.disconnect(
      user,
      connectedAccountId,
      workspaceId,
    );
  }
}
