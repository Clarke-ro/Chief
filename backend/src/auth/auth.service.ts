import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../common/config/app-config.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { BETTER_AUTH } from './auth.constants';
import type { BetterAuthInstance } from './better-auth.factory';
import type { AuthUser } from './decorators/current-user.decorator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly workspaces: WorkspaceService,
    private readonly prisma: PrismaService,
    @Inject(BETTER_AUTH) private readonly auth: BetterAuthInstance,
  ) {
    this.logger.log(
      `Better Auth ready (baseURL=${this.config.betterAuth.url})`,
    );
  }

  getAuth(): BetterAuthInstance {
    return this.auth;
  }

  async getMe(user: AuthUser) {
    const workspaceList = await this.workspaces.listForUser(user.id);
    if (workspaceList.length === 0) {
      const created = await this.workspaces.ensureDefaultWorkspace(user);
      workspaceList.push(created);
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { onboardingCompleted: true },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image ?? null,
        onboardingCompleted:
          dbUser?.onboardingCompleted ?? user.onboardingCompleted ?? false,
      },
      workspaces: workspaceList,
    };
  }

  async setOnboardingCompleted(userId: string, completed: boolean) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: completed },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        onboardingCompleted: true,
      },
    });
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image ?? null,
        onboardingCompleted: user.onboardingCompleted,
      },
    };
  }
}
