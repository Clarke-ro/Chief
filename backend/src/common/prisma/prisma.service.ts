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
    await this.ensureProviderMessageTable();
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

  /**
   * Same pooler/migrate gap as focus_dismissal — Chief chat reads Slack rows
   * from provider_message and 500s if the table was never created.
   */
  private async ensureProviderMessageTable(): Promise<void> {
    const statements = [
      `CREATE TABLE IF NOT EXISTS "provider_message" (
        "id" TEXT NOT NULL,
        "workspaceId" TEXT NOT NULL,
        "connectedAccountId" TEXT,
        "provider" "IntegrationProvider" NOT NULL,
        "providerMessageId" TEXT NOT NULL,
        "channelId" TEXT,
        "channelName" TEXT,
        "threadId" TEXT,
        "text" TEXT,
        "permalink" TEXT,
        "authorId" TEXT,
        "authorName" TEXT,
        "sentAt" TIMESTAMP(3),
        "raw" JSONB,
        "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "provider_message_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "provider_message_connectedAccountId_providerMessageId_key"
        ON "provider_message"("connectedAccountId", "providerMessageId")`,
      `CREATE INDEX IF NOT EXISTS "provider_message_workspaceId_sentAt_idx"
        ON "provider_message"("workspaceId", "sentAt")`,
      `CREATE INDEX IF NOT EXISTS "provider_message_workspaceId_provider_idx"
        ON "provider_message"("workspaceId", "provider")`,
    ];
    try {
      for (const sql of statements) {
        await Promise.race([
          this.$executeRawUnsafe(sql),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('provider_message DDL timed out')), 8_000),
          ),
        ]);
      }
      // FKs may already exist after a real migrate; ignore duplicate errors.
      try {
        await Promise.race([
          this.$executeRawUnsafe(`
            ALTER TABLE "provider_message"
            ADD CONSTRAINT "provider_message_workspaceId_fkey"
            FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
            ON DELETE CASCADE ON UPDATE CASCADE
          `),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('provider_message FK timed out')), 8_000),
          ),
        ]);
      } catch {
        // constraint already present or pooler skipped DDL
      }
      try {
        await Promise.race([
          this.$executeRawUnsafe(`
            ALTER TABLE "provider_message"
            ADD CONSTRAINT "provider_message_connectedAccountId_fkey"
            FOREIGN KEY ("connectedAccountId") REFERENCES "connected_account"("id")
            ON DELETE SET NULL ON UPDATE CASCADE
          `),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('provider_message FK timed out')), 8_000),
          ),
        ]);
      } catch {
        // constraint already present or pooler skipped DDL
      }
      this.logger.log('Ensured provider_message table exists');
    } catch (error) {
      this.logger.warn(
        {
          err: error instanceof Error ? error.message : String(error),
        },
        'Could not ensure provider_message table — Chief chat will soft-fail Slack context',
      );
    }
  }
}
