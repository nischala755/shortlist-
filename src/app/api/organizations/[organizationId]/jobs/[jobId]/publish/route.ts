import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getJobInOrganization } from "@/features/jobs/access";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; jobId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId, jobId } = await context.params;
    const access = await canAccessOrganization(organizationId, user.id, "job:manage");
    if (!access.membership) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    if (!access.allowed) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

    const existing = await getJobInOrganization(jobId, organizationId);
    if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (existing.status !== "DRAFT") return NextResponse.json({ error: "Only draft jobs can be published" }, { status: 409 });

    const job = await getPrisma().job.update({ where: { id: jobId }, data: { status: "PUBLISHED" }, select: { id: true, status: true } });
    return NextResponse.json({ job });
  } catch (error) {
    logger.error("Job publish failed", error);
    return NextResponse.json({ error: "Unable to publish job" }, { status: 500 });
  }
}
