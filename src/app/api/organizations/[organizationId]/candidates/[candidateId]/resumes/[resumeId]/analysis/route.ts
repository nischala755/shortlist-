import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { analyzeResumeWithMistral, ResumeAnalysisProviderError } from "@/features/resume-analysis/provider";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST(
  request: Request,
  context: { params: Promise<{ organizationId: string; candidateId: string; resumeId: string }> },
) {
  try {
    const { organizationId, candidateId, resumeId } = await context.params;
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const access = await canAccessOrganization(organizationId, user.id, "candidate:manage");
    if (!access.membership) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    if (!access.allowed) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

    const prisma = getPrisma();
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, organizationId, candidateId },
      select: { id: true, parsedText: true },
    });
    if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    if (!resume.parsedText) return NextResponse.json({ error: "Resume must be parsed before analysis" }, { status: 409 });

    const result = await analyzeResumeWithMistral(resume.parsedText);
    const analysis = await prisma.resumeAnalysis.upsert({
      where: { resumeId: resume.id },
      create: { resumeId: resume.id, requestedById: user.id, provider: result.provider, model: result.model, analysisJson: result.analysis },
      update: { requestedById: user.id, provider: result.provider, model: result.model, analysisJson: result.analysis, createdAt: new Date() },
      select: { id: true, provider: true, model: true, analysisJson: true, createdAt: true },
    });
    return NextResponse.json({ analysis });
  } catch (error) {
    if (error instanceof ResumeAnalysisProviderError) return NextResponse.json({ error: error.message }, { status: 503 });
    logger.error("Resume analysis failed", error);
    return NextResponse.json({ error: "Unable to analyze resume" }, { status: 500 });
  }
}
