import { getPrisma } from "@/lib/db";
import { Role } from "@/generated/prisma/client";

export type OrganizationPermission =
  | "organization:read"
  | "member:read"
  | "member:manage"
  | "job:read"
  | "job:manage";

const rolePermissions: Record<Role, readonly OrganizationPermission[]> = {
  [Role.CANDIDATE]: [],
  [Role.RECRUITER]: ["organization:read", "member:read", "member:manage", "job:read", "job:manage"],
  [Role.HIRING_MANAGER]: ["organization:read", "member:read", "member:manage", "job:read", "job:manage"],
  [Role.INTERVIEWER]: ["organization:read", "member:read", "job:read"],
  [Role.ADMIN]: ["organization:read", "member:read", "member:manage", "job:read", "job:manage"],
};

export function hasPermission(role: Role, permission: OrganizationPermission) {
  return rolePermissions[role].includes(permission);
}

export async function getOrganizationMembership(organizationId: string, userId: string) {
  return getPrisma().membership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { id: true, role: true },
  });
}

export async function canAccessOrganization(
  organizationId: string,
  userId: string,
  permission: OrganizationPermission,
) {
  const membership = await getOrganizationMembership(organizationId, userId);

  return {
    membership,
    allowed: membership !== null && hasPermission(membership.role, permission),
  };
}

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
      role: true,
      user: { select: { id: true, email: true } },
    },
  });
}
