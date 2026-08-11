-- CreateEnum
CREATE TYPE "CodingAssessmentStatus" AS ENUM ('DRAFT', 'ASSIGNED', 'CLOSED');

-- CreateTable
CREATE TABLE "CodingAssessment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" "CodingAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingQuestion" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "prompt" TEXT NOT NULL,
    "language" TEXT,
    "starterCode" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodingAssessment_organizationId_status_idx" ON "CodingAssessment"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CodingAssessment_applicationId_idx" ON "CodingAssessment"("applicationId");

-- CreateIndex
CREATE INDEX "CodingQuestion_assessmentId_position_idx" ON "CodingQuestion"("assessmentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "CodingQuestion_assessmentId_position_key" ON "CodingQuestion"("assessmentId", "position");

-- AddForeignKey
ALTER TABLE "CodingAssessment" ADD CONSTRAINT "CodingAssessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingAssessment" ADD CONSTRAINT "CodingAssessment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingAssessment" ADD CONSTRAINT "CodingAssessment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingQuestion" ADD CONSTRAINT "CodingQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "CodingAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
