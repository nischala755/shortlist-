import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { CreateOrganizationForm } from "@/components/create-organization-form";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/features/auth/session";
import { getPrisma } from "@/lib/db";

export default async function DashboardPage() {
  const requestHeaders = await headers();
  const user = await getCurrentUser(new Request(process.env.APP_URL ?? "http://localhost:3000", { headers: requestHeaders }));
  if (!user) redirect("/login");
  const organizations = await getPrisma().organization.findMany({ where: { memberships: { some: { userId: user.id } } }, orderBy: { name: "asc" }, select: { id: true, name: true, memberships: { where: { userId: user.id }, select: { role: true } } } });
  const candidateOnly = organizations.length > 0 && organizations.every((organization) => organization.memberships[0]?.role === "CANDIDATE");

  return <div className="dashboard-shell"><header className="dashboard-header"><Brand /><div><span>{user.email}</span><LogoutButton /></div></header><main className="dashboard-main"><div className="dashboard-title"><div><p className="eyebrow">Workspace</p><h1>{candidateOnly ? "Your candidate portal." : "Good hiring starts with a clear brief."}</h1><p>Select an organization to continue to your authorized workspace.</p></div>{!candidateOnly && <CreateOrganizationForm />}</div>{organizations.length > 0 ? <section className="workspace-grid" aria-label="Your organizations">{organizations.map((organization) => { const role = organization.memberships[0]?.role; return <Link href={role === "CANDIDATE" ? `/portal/organizations/${organization.id}` : `/dashboard/organizations/${organization.id}`} key={organization.id}><span className="workspace-mark">{organization.name.slice(0, 2).toUpperCase()}</span><div><strong>{organization.name}</strong><small>{role?.replaceAll("_", " ").toLowerCase()}</small></div><span className="workspace-arrow" aria-hidden="true">Go</span></Link>; })}</section> : <section className="empty-state"><span className="empty-icon" aria-hidden="true">+</span><h2>No organization yet</h2><p>Create your first organization to establish an isolated hiring workspace.</p></section>}</main></div>;
}
