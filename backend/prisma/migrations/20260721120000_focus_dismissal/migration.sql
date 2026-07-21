-- AlterTable
CREATE TABLE "focus_dismissal" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "sourceKey" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "title" TEXT,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "focus_dismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "focus_dismissal_workspaceId_dismissedAt_idx" ON "focus_dismissal"("workspaceId", "dismissedAt");

-- CreateIndex
CREATE UNIQUE INDEX "focus_dismissal_workspaceId_sourceKey_key" ON "focus_dismissal"("workspaceId", "sourceKey");

-- AddForeignKey
ALTER TABLE "focus_dismissal" ADD CONSTRAINT "focus_dismissal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
