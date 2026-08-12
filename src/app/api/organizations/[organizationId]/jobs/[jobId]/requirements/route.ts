import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getJobInOrganization } from "@/features/jobs/access";
import {
  JobValidationError,
  validateJobRequirementInput,
} from "@/features/jobs/job";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; jobId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId, jobId } = await context.params;
    const access = await canAccessOrganization(organizationId, user.id, "job:read");
    if (!access.membership) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    if (!access.allowed) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    const job = await getJobInOrganization(jobId, organizationId);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const requirements = await getPrisma().jobRequirement.findMany({
      where: { jobId },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, description: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ requirements });
  } catch (error) {
    logger.error("Job requirement list failed", error);
    return NextResponse.json({ error: "Unable to list requirements" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; jobId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId, jobId } = await context.params;
    const access = await canAccessOrganization(organizationId, user.id, "job:manage");
    if (!access.membership) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    if (!access.allowed) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    const job = await getJobInOrganization(jobId, organizationId);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (job.status !== "DRAFT") return NextResponse.json({ error: "Requirements can only be changed on draft jobs" }, { status: 409 });

    const input = validateJobRequirementInput(await request.json());
    const requirement = await getPrisma().jobRequirement.create({
      data: { jobId, ...input },
      select: { id: true, title: true, description: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ requirement }, { status: 201 });
  } catch (error) {
    if (error instanceof JobValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return NextResponse.json({ error: "This job already has a requirement with that title" }, { status: 409 });
    logger.error("Job requirement creation failed", error);
    return NextResponse.json({ error: "Unable to create requirement" }, { status: 500 });
  }
}
