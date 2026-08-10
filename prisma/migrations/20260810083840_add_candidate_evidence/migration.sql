-- CreateEnum
CREATE TYPE "EvidenceSource" AS ENUM ('RESUME', 'INTERVIEW', 'ASSESSMENT', 'MANUAL');

-- CreateTable
CREATE TABLE "CandidateEvidence" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "jobRequirementId" UUID,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "sourceType" "EvidenceSource" NOT NULL,
    "sourceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CandidateEvidence_organizationId_candidateId_createdAt_idx" ON "CandidateEvidence"("organizationId", "candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "CandidateEvidence_jobRequirementId_idx" ON "CandidateEvidence"("jobRequirementId");

-- AddForeignKey
ALTER TABLE "CandidateEvidence" ADD CONSTRAINT "CandidateEvidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEvidence" ADD CONSTRAINT "CandidateEvidence_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEvidence" ADD CONSTRAINT "CandidateEvidence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEvidence" ADD CONSTRAINT "CandidateEvidence_jobRequirementId_fkey" FOREIGN KEY ("jobRequirementId") REFERENCES "JobRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
