import { getCurrentUser } from "@/features/auth/session";
import { getPrisma } from "@/lib/db";

export async function getCandidatePortalContext(request: Request, organizationId: string) {
  const user = await getCurrentUser(request);
  if (!user) return { response: "Authentication required" as const, status: 401 as const };
  const membership = await getPrisma().membership.findUnique({
    where: { organizationId_userId: { organizationId, userId: user.id } },
    select: { role: true },
  });
  if (!membership) return { response: "Organization not found" as const, status: 404 as const };
  if (membership.role !== "CANDIDATE") return { response: "Candidate portal access required" as const, status: 403 as const };
  const candidate = await getPrisma().candidate.findFirst({ where: { organizationId, email: user.email.toLowerCase() }, select: { id: true, name: true, email: true } });
  if (!candidate) return { response: "Candidate profile not found" as const, status: 404 as const };
  return { user, candidate };
}
