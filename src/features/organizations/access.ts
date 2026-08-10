import { getPrisma } from "@/lib/db";

export async function getOrganizationForUser(organizationId: string, userId: string) {
  return getPrisma().organization.findFirst({
    where: {
      id: organizationId,
      memberships: { some: { userId } },
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });
}

export async function listOrganizationMembers(organizationId: string, userId: string) {
  return getPrisma().membership.findMany({
    where: {
      organizationId,
      organization: { memberships: { some: { userId } } },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      user: { select: { id: true, email: true } },
    },
  });
}
