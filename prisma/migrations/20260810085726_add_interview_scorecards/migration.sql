-- CreateTable
CREATE TABLE "InterviewScorecard" (
    "id" UUID NOT NULL,
    "interviewId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "criteriaJson" JSONB NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "strengths" TEXT,
    "concerns" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewScorecard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewScorecard_interviewId_key" ON "InterviewScorecard"("interviewId");

-- CreateIndex
CREATE INDEX "InterviewScorecard_submittedById_idx" ON "InterviewScorecard"("submittedById");

-- AddForeignKey
ALTER TABLE "InterviewScorecard" ADD CONSTRAINT "InterviewScorecard_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewScorecard" ADD CONSTRAINT "InterviewScorecard_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
