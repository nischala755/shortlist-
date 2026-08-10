import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getJobInOrganization } from "@/features/jobs/access";
import { JobValidationError, validateJobInput } from "@/features/jobs/job";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

async function authorizeJob(request: Request, organizationId: string, permission: "job:read" | "job:manage") {
  const user = await getCurrentUser(request);
  if (!user) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };

  const access = await canAccessOrganization(organizationId, user.id, permission);
  if (!access.membership) return { response: NextResponse.json({ error: "Organization not found" }, { status: 404 }) };
  if (!access.allowed) return { response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };

  return { user };
}

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; jobId: string }> }) {
  try {
    const { organizationId, jobId } = await context.params;
    const access = await authorizeJob(request, organizationId, "job:read");
    if (access.response) return access.response;

    const job = await getJobInOrganization(jobId, organizationId);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json({ job });
  } catch (error) {
    logger.error("Job lookup failed", error);
    return NextResponse.json({ error: "Unable to load job" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ organizationId: string; jobId: string }> }) {
  try {
    const { organizationId, jobId } = await context.params;
    const access = await authorizeJob(request, organizationId, "job:manage");
    if (access.response) return access.response;

    const existing = await getJobInOrganization(jobId, organizationId);
    if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (existing.status !== "DRAFT") return NextResponse.json({ error: "Only draft jobs can be edited" }, { status: 409 });

    const input = validateJobInput(await request.json());
    const job = await getPrisma().job.update({
      where: { id: jobId },
      data: input,
      select: { id: true, title: true, description: true, status: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ job });
  } catch (error) {
    if (error instanceof JobValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    logger.error("Job update failed", error);
    return NextResponse.json({ error: "Unable to update job" }, { status: 500 });
  }
}
