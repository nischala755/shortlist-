import { getPrisma } from "@/lib/db";

export async function getJobInOrganization(jobId: string, organizationId: string) {
  return getPrisma().job.findFirst({
    where: { id: jobId, organizationId },
    select: { id: true, organizationId: true, title: true, description: true, status: true },
  });
}
