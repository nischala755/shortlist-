import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import {
  OrganizationValidationError,
  validateOrganizationInput,
} from "@/features/organizations/organization";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const organizations = await getPrisma().organization.findMany({
      where: { memberships: { some: { userId: user.id } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, createdAt: true },
    });

    return NextResponse.json({ organizations });
  } catch (error) {
    logger.error("Organization list lookup failed", error);
    return NextResponse.json({ error: "Unable to list organizations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  let organizationInput;

  try {
    organizationInput = validateOrganizationInput(body);
  } catch (error) {
    if (error instanceof OrganizationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    logger.error("Organization validation failed", error);
    return NextResponse.json({ error: "Invalid organization data" }, { status: 400 });
  }

  try {
    const organization = await getPrisma().$transaction(async (transaction) => {
      const createdOrganization = await transaction.organization.create({
        data: { name: organizationInput.name },
        select: { id: true, name: true, createdAt: true },
      });

      await transaction.membership.create({
        data: {
          organizationId: createdOrganization.id,
          userId: user.id,
          role: "ADMIN",
        },
      });

      return createdOrganization;
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    logger.error("Organization creation failed", error);
    return NextResponse.json({ error: "Unable to create organization" }, { status: 500 });
  }
}
