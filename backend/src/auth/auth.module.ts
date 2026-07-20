import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppConfigService } from '../common/config/app-config.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceModule } from '../workspace/workspace.module';
import { BETTER_AUTH } from './auth.constants';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { createBetterAuth } from './better-auth.factory';
import { SessionGuard } from './guards/session.guard';

@Global()
@Module({
  imports: [WorkspaceModule],
  controllers: [AuthController],
  providers: [
    {
      provide: BETTER_AUTH,
      inject: [PrismaService, AppConfigService],
      useFactory: (prisma: PrismaService, config: AppConfigService) =>
        createBetterAuth(prisma, {
          secret: config.betterAuth.secret,
          baseURL: config.betterAuth.url,
          trustedOrigins: config.corsOrigins,
        }),
    },
    AuthService,
    SessionGuard,
    {
      provide: APP_GUARD,
      useClass: SessionGuard,
    },
  ],
  exports: [BETTER_AUTH, AuthService, SessionGuard],
})
export class AuthModule {}
