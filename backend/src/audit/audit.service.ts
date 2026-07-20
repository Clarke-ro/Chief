import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async append(input: {
    action: string;
    workspaceId?: string;
    actorUserId?: string;
    resource?: string;
    meta?: Prisma.InputJsonValue;
    ip?: string;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: input.action,
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        resource: input.resource,
        metaJson: input.meta,
        ip: input.ip,
      },
    });
  }
}
