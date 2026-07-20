import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { BETTER_AUTH } from '../auth.constants';
import type { BetterAuthInstance } from '../better-auth.factory';
import type { AuthUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const SESSION_COOKIE_NAMES = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
];

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(BETTER_AUTH) private readonly auth: BetterAuthInstance,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser; session?: unknown }>();

    const session = await this.resolveSession(request);
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }

    request.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      onboardingCompleted: Boolean(
        (session.user as { onboardingCompleted?: boolean }).onboardingCompleted,
      ),
    };
    request.session = session.session;
    return true;
  }

  private async resolveSession(request: Request) {
    const headers = new Headers(fromNodeHeaders(request.headers));
    let session = await this.auth.api.getSession({ headers });
    if (session?.user) {
      return session;
    }

    const bearer = request.headers.authorization;
    if (!bearer?.toLowerCase().startsWith('bearer ')) {
      return session;
    }

    const token = bearer.slice(7).trim();
    if (!token) {
      return session;
    }

    for (const cookieName of SESSION_COOKIE_NAMES) {
      const bearerHeaders = new Headers();
      bearerHeaders.set('cookie', `${cookieName}=${token}`);
      session = await this.auth.api.getSession({ headers: bearerHeaders });
      if (session?.user) {
        return session;
      }
    }

    return session;
  }
}
