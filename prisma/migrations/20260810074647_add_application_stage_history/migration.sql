-- CreateTable
CREATE TABLE "ApplicationStageHistory" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "changedById" UUID NOT NULL,
    "fromStage" "ApplicationStage",
    "toStage" "ApplicationStage" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationStageHistory_applicationId_changedAt_idx" ON "ApplicationStageHistory"("applicationId", "changedAt");

-- AddForeignKey
ALTER TABLE "ApplicationStageHistory" ADD CONSTRAINT "ApplicationStageHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStageHistory" ADD CONSTRAINT "ApplicationStageHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
