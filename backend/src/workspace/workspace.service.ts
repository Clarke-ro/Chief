import { Injectable } from '@nestjs/common';
import { MembershipRole, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AuthUser } from '../auth/decorators/current-user.decorator';

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  role: MembershipRole;
};

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<WorkspaceSummary[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
    }));
  }

  async ensureDefaultWorkspace(user: AuthUser): Promise<WorkspaceSummary> {
    const existing = await this.listForUser(user.id);
    if (existing[0]) {
      return existing[0];
    }

    const baseSlug = this.slugify(
      user.name?.split(' ')[0] || user.email.split('@')[0] || 'workspace',
    );
    const slug = await this.uniqueSlug(baseSlug);
    const name = `${user.name?.split(' ')[0] || 'My'}'s Workspace`;

    try {
      const workspace = await this.prisma.workspace.create({
        data: {
          name,
          slug,
          memberships: {
            create: {
              userId: user.id,
              role: MembershipRole.owner,
            },
          },
        },
      });

      return {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        role: MembershipRole.owner,
      };
    } catch (error) {
      // Parallel first-login races: unique slug or concurrent membership create.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const again = await this.listForUser(user.id);
        if (again[0]) {
          return again[0];
        }
      }
      throw error;
    }
  }

  async assertMembership(userId: string, workspaceId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });
    return membership;
  }

  private slugify(input: string): string {
    return (
      input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'workspace'
    );
  }

  private async uniqueSlug(base: string): Promise<string> {
    let candidate = base;
    let i = 0;
    while (
      await this.prisma.workspace.findUnique({ where: { slug: candidate } })
    ) {
      i += 1;
      candidate = `${base}-${i}`;
    }
    return candidate;
  }
}
