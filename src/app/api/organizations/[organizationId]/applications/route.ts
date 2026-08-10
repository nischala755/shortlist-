import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { ApplicationValidationError, validateApplicationInput } from "@/features/applications/application";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId } = await context.params;
    const access = await canAccessOrganization(organizationId, user.id, "application:read");
    if (!access.membership) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    if (!access.allowed) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

    const stage = new URL(request.url).searchParams.get("stage") ?? undefined;
    const applications = await getPrisma().application.findMany({
      where: { organizationId, ...(stage ? { currentStage: stage as never } : {}) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        currentStage: true,
        createdAt: true,
        updatedAt: true,
        job: { select: { id: true, title: true } },
        candidate: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json({ applications });
  } catch (error) {
    logger.error("Application list lookup failed", error);
    return NextResponse.json({ error: "Unable to list applications" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId } = await context.params;
    const access = await canAccessOrganization(organizationId, user.id, "application:manage");
    if (!access.membership) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    if (!access.allowed) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

    const input = validateApplicationInput(await request.json());
    const application = await getPrisma().$transaction(async (transaction) => {
      const job = await transaction.job.findFirst({ where: { id: input.jobId, organizationId }, select: { id: true } });
      const candidate = await transaction.candidate.findFirst({ where: { id: input.candidateId, organizationId }, select: { id: true } });
      if (!job || !candidate) return null;

      const application = await transaction.application.create({
        data: { organizationId, jobId: input.jobId, candidateId: input.candidateId, createdById: user.id },
        select: { id: true, currentStage: true, createdAt: true, updatedAt: true },
      });

      await transaction.applicationStageHistory.create({
        data: { applicationId: application.id, changedById: user.id, toStage: "APPLIED" },
      });

      return application;
    });

    if (!application) return NextResponse.json({ error: "Job or candidate not found" }, { status: 404 });
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    if (error instanceof ApplicationValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "This candidate already has an application for the job" }, { status: 409 });
    }
    logger.error("Application creation failed", error);
    return NextResponse.json({ error: "Unable to create application" }, { status: 500 });
  }
}
