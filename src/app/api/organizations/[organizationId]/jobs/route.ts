import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { JobValidationError, validateJobInput } from "@/features/jobs/job";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

async function requireJobPermission(request: Request, organizationId: string, permission: "job:read" | "job:manage") {
  const user = await getCurrentUser(request);

  if (!user) {
    return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }

  const access = await canAccessOrganization(organizationId, user.id, permission);

  if (!access.membership) {
    return { response: NextResponse.json({ error: "Organization not found" }, { status: 404 }) };
  }

  if (!access.allowed) {
    return { response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  }

  return { user };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    const { organizationId } = await context.params;
    const access = await requireJobPermission(request, organizationId, "job:read");

    if (access.response) return access.response;

    const jobs = await getPrisma().job.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, description: true, status: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    logger.error("Job list lookup failed", error);
    return NextResponse.json({ error: "Unable to list jobs" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    const { organizationId } = await context.params;
    const access = await requireJobPermission(request, organizationId, "job:manage");

    if (access.response) return access.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    const jobInput = validateJobInput(body);
    const job = await getPrisma().job.create({
      data: { organizationId, createdById: access.user.id, ...jobInput },
      select: { id: true, title: true, description: true, status: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    if (error instanceof JobValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    logger.error("Job creation failed", error);
    return NextResponse.json({ error: "Unable to create job" }, { status: 500 });
  }
}
