-- Synced chat/channel messages from Slack (and future message providers).
-- Distinct from AI conversation `message` rows.

CREATE TABLE "provider_message" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_message_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "provider_message_connectedAccountId_providerMessageId_key" ON "provider_message"("connectedAccountId", "providerMessageId");

CREATE INDEX "provider_message_workspaceId_sentAt_idx" ON "provider_message"("workspaceId", "sentAt");

CREATE INDEX "provider_message_workspaceId_provider_idx" ON "provider_message"("workspaceId", "provider");

ALTER TABLE "provider_message" ADD CONSTRAINT "provider_message_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "provider_message" ADD CONSTRAINT "provider_message_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
