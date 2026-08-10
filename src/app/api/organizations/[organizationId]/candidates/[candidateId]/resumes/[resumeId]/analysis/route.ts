import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { analyzeResumeWithMistral, ResumeAnalysisProviderError } from "@/features/resume-analysis/provider";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

async function authorize(
  request: Request,
  organizationId: string,
  permission: "candidate:read" | "candidate:manage",
) {
  const user = await getCurrentUser(request);
  if (!user) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  const access = await canAccessOrganization(organizationId, user.id, permission);
  if (!access.membership) return { response: NextResponse.json({ error: "Organization not found" }, { status: 404 }) };
  if (!access.allowed) return { response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  return { user };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ organizationId: string; candidateId: string; resumeId: string }> },
) {
  try {
    const { organizationId, candidateId, resumeId } = await context.params;
    const access = await authorize(request, organizationId, "candidate:read");
    if (access.response) return access.response;

    const analysis = await getPrisma().resumeAnalysis.findFirst({
      where: { resumeId, resume: { organizationId, candidateId } },
      select: { id: true, provider: true, model: true, analysisJson: true, createdAt: true },
    });
    if (!analysis) return NextResponse.json({ error: "Resume analysis not found" }, { status: 404 });
    return NextResponse.json({ analysis });
  } catch (error) {
    logger.error("Resume analysis lookup failed", error);
    return NextResponse.json({ error: "Unable to load resume analysis" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ organizationId: string; candidateId: string; resumeId: string }> },
) {
  try {
    const { organizationId, candidateId, resumeId } = await context.params;
    const access = await authorize(request, organizationId, "candidate:manage");
    if (access.response) return access.response;
    const user = access.user;

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
