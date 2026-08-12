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

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header"><Brand /><div><span>{user.email}</span><LogoutButton /></div></header>
      <main className="dashboard-main">
        <div className="dashboard-title"><div><p className="eyebrow">Workspace</p><h1>Good hiring starts with a clear brief.</h1><p>Select an organization or create one to begin the recruiting workflow.</p></div><CreateOrganizationForm /></div>
        {organizations.length > 0 ? <section className="workspace-grid" aria-label="Your organizations">{organizations.map((organization) => <article key={organization.id}><span className="workspace-mark">{organization.name.slice(0, 2).toUpperCase()}</span><div><strong>{organization.name}</strong><small>{organization.memberships[0]?.role.replaceAll("_", " ").toLowerCase()}</small></div></article>)}</section> : <section className="empty-state"><span className="empty-icon" aria-hidden="true">◇</span><h2>No organization yet</h2><p>Create your first organization to establish an isolated hiring workspace.</p></section>}
      </main>
    </div>
  );
}
