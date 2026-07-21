import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected to PostgreSQL');
    await this.ensureFocusDismissalTable();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }

  /**
   * When SKIP_PRISMA_MIGRATE=1 (pooler hangs migrate deploy), still create
   * focus_dismissal so Home brief compose does not 500.
   */
  private async ensureFocusDismissalTable(): Promise<void> {
    const statements = [
      `CREATE TABLE IF NOT EXISTS "focus_dismissal" (
        "id" TEXT NOT NULL,
        "workspaceId" TEXT NOT NULL,
        "userId" TEXT,
        "sourceKey" TEXT NOT NULL,
        "sourceType" TEXT NOT NULL,
        "title" TEXT,
        "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "focus_dismissal_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "focus_dismissal_workspaceId_sourceKey_key"
        ON "focus_dismissal"("workspaceId", "sourceKey")`,
      `CREATE INDEX IF NOT EXISTS "focus_dismissal_workspaceId_dismissedAt_idx"
        ON "focus_dismissal"("workspaceId", "dismissedAt")`,
    ];
    try {
      for (const sql of statements) {
        await Promise.race([
          this.$executeRawUnsafe(sql),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('focus_dismissal DDL timed out')), 8_000),
          ),
        ]);
      }
      this.logger.log('Ensured focus_dismissal table exists');
    } catch (error) {
      this.logger.warn(
        {
          err: error instanceof Error ? error.message : String(error),
        },
        'Could not ensure focus_dismissal table — brief will soft-fail dismissals',
      );
    }
  }
}
