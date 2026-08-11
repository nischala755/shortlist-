-- CreateEnum
CREATE TYPE "CodingSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateTable
CREATE TABLE "CodingSubmission" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "status" "CodingSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "answersJson" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodingSubmission_assessmentId_key" ON "CodingSubmission"("assessmentId");

-- CreateIndex
CREATE INDEX "CodingSubmission_submittedById_status_idx" ON "CodingSubmission"("submittedById", "status");

-- AddForeignKey
ALTER TABLE "CodingSubmission" ADD CONSTRAINT "CodingSubmission_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "CodingAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingSubmission" ADD CONSTRAINT "CodingSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
