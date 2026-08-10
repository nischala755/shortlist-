import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { removeResume, ResumeValidationError, saveResume } from "@/features/resumes/storage";

async function authorizeCandidate(request: Request, organizationId: string, permission: "candidate:read" | "candidate:manage") {
  const user = await getCurrentUser(request);
  if (!user) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  const access = await canAccessOrganization(organizationId, user.id, permission);
  if (!access.membership) return { response: NextResponse.json({ error: "Organization not found" }, { status: 404 }) };
  if (!access.allowed) return { response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  return { user };
}

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; candidateId: string }> }) {
  try {
    const { organizationId, candidateId } = await context.params;
    const access = await authorizeCandidate(request, organizationId, "candidate:read");
    if (access.response) return access.response;
    const candidate = await getPrisma().candidate.findFirst({ where: { id: candidateId, organizationId }, select: { id: true } });
    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    const resumes = await getPrisma().resume.findMany({
      where: { organizationId, candidateId },
      orderBy: { createdAt: "desc" },
      select: { id: true, originalName: true, mimeType: true, sizeBytes: true, sha256: true, createdAt: true },
    });
    return NextResponse.json({ resumes });
  } catch (error) {
    logger.error("Resume list lookup failed", error);
    return NextResponse.json({ error: "Unable to list resumes" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; candidateId: string }> }) {
  let savedResume: Awaited<ReturnType<typeof saveResume>> | undefined;
  try {
    const { organizationId, candidateId } = await context.params;
    const access = await authorizeCandidate(request, organizationId, "candidate:manage");
    if (access.response) return access.response;
    const candidate = await getPrisma().candidate.findFirst({ where: { id: candidateId, organizationId }, select: { id: true } });
    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    const form = await request.formData();
    const value = form.get("resume");
    if (!(value instanceof File)) return NextResponse.json({ error: "Resume file is required" }, { status: 400 });

    savedResume = await saveResume(value);
    const resume = await getPrisma().resume.create({
      data: { organizationId, candidateId, uploadedById: access.user.id, ...savedResume },
      select: { id: true, originalName: true, mimeType: true, sizeBytes: true, sha256: true, createdAt: true },
    });
    return NextResponse.json({ resume }, { status: 201 });
  } catch (error) {
    if (savedResume) await removeResume(savedResume.storageKey);
    if (error instanceof ResumeValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    logger.error("Resume upload failed", error);
    return NextResponse.json({ error: "Unable to upload resume" }, { status: 500 });
  }
}
