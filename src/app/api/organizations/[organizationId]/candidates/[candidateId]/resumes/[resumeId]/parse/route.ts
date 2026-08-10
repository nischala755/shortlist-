import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { parseResumeText, ResumeParsingError } from "@/features/resumes/parser";
import { readResume } from "@/features/resumes/storage";
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
      select: { id: true, storageKey: true, mimeType: true },
    });
    if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });

    const contents = await readResume(resume.storageKey);
    const parsedText = await parseResumeText(resume.mimeType, contents);
    const parsed = await prisma.resume.update({
      where: { id: resume.id },
      data: { parsedText, parsedAt: new Date() },
      select: { id: true, parsedText: true, parsedAt: true },
    });

    return NextResponse.json({ resume: parsed });
  } catch (error) {
    if (error instanceof ResumeParsingError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    logger.error("Resume parsing failed", error);
    return NextResponse.json({ error: "Unable to parse resume" }, { status: 500 });
  }
}
