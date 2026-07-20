-- Sync domain + preferences + OAuth token vault + sync state

-- Enums
CREATE TYPE "SyncResource" AS ENUM ('calendar', 'email', 'contacts', 'tasks', 'messages');
CREATE TYPE "SyncRunStatus" AS ENUM ('idle', 'running', 'succeeded', 'failed');
CREATE TYPE "NotificationChannel" AS ENUM ('in_app', 'push', 'email');
CREATE TYPE "MessageRole" AS ENUM ('user', 'chief', 'system');
CREATE TYPE "TaskPriority" AS ENUM ('high', 'medium', 'low');
CREATE TYPE "TaskStatus" AS ENUM ('ready', 'in_progress', 'waiting', 'done');
CREATE TYPE "TaskSection" AS ENUM ('today', 'upcoming', 'waiting', 'completed');
CREATE TYPE "ScheduleBlockKind" AS ENUM ('normal', 'major');
CREATE TYPE "ScheduleItemStatus" AS ENUM ('completed', 'in_progress', 'upcoming');
CREATE TYPE "SweepPhase" AS ENUM ('none', 'checking', 'cleared', 'still_open');
CREATE TYPE "ThemePreference" AS ENUM ('system', 'light', 'dark');

-- OAuth token vault (1:1 with connected_account)
CREATE TABLE "oauth_token" (
    "id" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "tokenType" TEXT,
    "scopeSnapshot" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_token_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "oauth_token_connectedAccountId_key" ON "oauth_token"("connectedAccountId");

ALTER TABLE "oauth_token" ADD CONSTRAINT "oauth_token_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill vault rows from existing sealed tokens
INSERT INTO "oauth_token" ("id", "connectedAccountId", "encryptedPayload", "accessTokenExpiresAt", "scopeSnapshot", "createdAt", "updatedAt")
SELECT
  'tok_' || "id",
  "id",
  "encryptedTokens",
  "tokenExpiresAt",
  "scopes",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "connected_account";

-- Sync state
CREATE TABLE "sync_state" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "resource" "SyncResource" NOT NULL,
    "cursor" TEXT,
    "status" "SyncRunStatus" NOT NULL DEFAULT 'idle',
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_state_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sync_state_connectedAccountId_resource_key" ON "sync_state"("connectedAccountId", "resource");
CREATE INDEX "sync_state_workspaceId_resource_idx" ON "sync_state"("workspaceId", "resource");

ALTER TABLE "sync_state" ADD CONSTRAINT "sync_state_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sync_state" ADD CONSTRAINT "sync_state_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Calendar events
CREATE TABLE "calendar_event" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "connectedAccountId" TEXT,
    "provider" "IntegrationProvider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "status" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT,
    "attendees" JSONB,
    "htmlLink" TEXT,
    "raw" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "calendar_event_connectedAccountId_providerEventId_key" ON "calendar_event"("connectedAccountId", "providerEventId");
CREATE INDEX "calendar_event_workspaceId_startsAt_idx" ON "calendar_event"("workspaceId", "startsAt");
CREATE INDEX "calendar_event_workspaceId_provider_idx" ON "calendar_event"("workspaceId", "provider");

ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Email
CREATE TABLE "email" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "connectedAccountId" TEXT,
    "provider" "IntegrationProvider" NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "threadId" TEXT,
    "subject" TEXT,
    "snippet" TEXT,
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "fromAddress" TEXT,
    "fromName" TEXT,
    "toAddresses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ccAddresses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "labelIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isUnread" BOOLEAN NOT NULL DEFAULT true,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3),
    "raw" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_connectedAccountId_providerMessageId_key" ON "email"("connectedAccountId", "providerMessageId");
CREATE INDEX "email_workspaceId_receivedAt_idx" ON "email"("workspaceId", "receivedAt");
CREATE INDEX "email_workspaceId_isUnread_idx" ON "email"("workspaceId", "isUnread");

ALTER TABLE "email" ADD CONSTRAINT "email_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email" ADD CONSTRAINT "email_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Contact
CREATE TABLE "contact" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "connectedAccountId" TEXT,
    "provider" "IntegrationProvider",
    "providerContactId" TEXT,
    "displayName" TEXT,
    "givenName" TEXT,
    "familyName" TEXT,
    "primaryEmail" TEXT,
    "emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "phones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "company" TEXT,
    "raw" JSONB,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contact_connectedAccountId_providerContactId_key" ON "contact"("connectedAccountId", "providerContactId");
CREATE INDEX "contact_workspaceId_primaryEmail_idx" ON "contact"("workspaceId", "primaryEmail");
CREATE INDEX "contact_workspaceId_displayName_idx" ON "contact"("workspaceId", "displayName");

ALTER TABLE "contact" ADD CONSTRAINT "contact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contact" ADD CONSTRAINT "contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contact" ADD CONSTRAINT "contact_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Notification
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'in_app',
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "meta" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_userId_createdAt_idx" ON "notification"("userId", "createdAt");
CREATE INDEX "notification_workspaceId_createdAt_idx" ON "notification"("workspaceId", "createdAt");
CREATE INDEX "notification_userId_readAt_idx" ON "notification"("userId", "readAt");

ALTER TABLE "notification" ADD CONSTRAINT "notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AI conversation + message
CREATE TABLE "ai_conversation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "preview" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_conversation_workspaceId_updatedAt_idx" ON "ai_conversation"("workspaceId", "updatedAt");
CREATE INDEX "ai_conversation_userId_updatedAt_idx" ON "ai_conversation"("userId", "updatedAt");

ALTER TABLE "ai_conversation" ADD CONSTRAINT "ai_conversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_conversation" ADD CONSTRAINT "ai_conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "message_conversationId_createdAt_idx" ON "message"("conversationId", "createdAt");

ALTER TABLE "message" ADD CONSTRAINT "message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Brief
CREATE TABLE "brief" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "briefDate" DATE NOT NULL,
    "userName" TEXT,
    "successScore" DOUBLE PRECISION,
    "successLabel" TEXT,
    "successInsight" TEXT,
    "payload" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brief_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brief_workspaceId_briefDate_key" ON "brief"("workspaceId", "briefDate");
CREATE INDEX "brief_workspaceId_generatedAt_idx" ON "brief"("workspaceId", "generatedAt");

ALTER TABLE "brief" ADD CONSTRAINT "brief_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "brief" ADD CONSTRAINT "brief_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Task
CREATE TABLE "task" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "connectedAccountId" TEXT,
    "provider" "IntegrationProvider",
    "providerTaskId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "platform" TEXT NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'medium',
    "status" "TaskStatus" NOT NULL DEFAULT 'ready',
    "section" "TaskSection" NOT NULL DEFAULT 'today',
    "estimatedTime" TEXT,
    "estimatedMinutes" INTEGER,
    "confidence" DOUBLE PRECISION,
    "dueAt" TIMESTAMP(3),
    "dueLabel" TEXT,
    "sourceBriefId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "task_connectedAccountId_providerTaskId_key" ON "task"("connectedAccountId", "providerTaskId");
CREATE INDEX "task_workspaceId_section_status_idx" ON "task"("workspaceId", "section", "status");
CREATE INDEX "task_workspaceId_dueAt_idx" ON "task"("workspaceId", "dueAt");
CREATE INDEX "task_userId_status_idx" ON "task"("userId", "status");

ALTER TABLE "task" ADD CONSTRAINT "task_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task" ADD CONSTRAINT "task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "task" ADD CONSTRAINT "task_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Schedule item (Today timeline)
CREATE TABLE "schedule_item" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "platform" TEXT NOT NULL,
    "timeLabel" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" "ScheduleItemStatus" NOT NULL DEFAULT 'upcoming',
    "duration" TEXT,
    "attendees" INTEGER,
    "blockKind" "ScheduleBlockKind" NOT NULL DEFAULT 'normal',
    "focusId" TEXT,
    "sweepPhase" "SweepPhase" NOT NULL DEFAULT 'none',
    "lastSweepAt" TIMESTAMP(3),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_item_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "schedule_item_workspaceId_startsAt_idx" ON "schedule_item"("workspaceId", "startsAt");
CREATE INDEX "schedule_item_workspaceId_status_idx" ON "schedule_item"("workspaceId", "status");

ALTER TABLE "schedule_item" ADD CONSTRAINT "schedule_item_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Analytics
CREATE TABLE "analytics_snapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "payload" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_snapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "analytics_snapshot_workspaceId_periodStart_periodEnd_key" ON "analytics_snapshot"("workspaceId", "periodStart", "periodEnd");
CREATE INDEX "analytics_snapshot_workspaceId_generatedAt_idx" ON "analytics_snapshot"("workspaceId", "generatedAt");

ALTER TABLE "analytics_snapshot" ADD CONSTRAINT "analytics_snapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- User preferences
CREATE TABLE "user_preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" "ThemePreference" NOT NULL DEFAULT 'system',
    "notificationPrefs" JSONB NOT NULL DEFAULT '{}',
    "appearance" JSONB NOT NULL DEFAULT '{}',
    "workingHours" JSONB,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_preference_userId_key" ON "user_preference"("userId");

ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
