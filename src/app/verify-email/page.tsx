import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { VerifyEmailForm } from "@/components/token-form";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <AuthShell eyebrow="Email verification" title="Confirm your email" description="Verification protects your organization before any hiring information is available." footer={<Link href="/login">Return to sign in</Link>}><VerifyEmailForm token={token} /></AuthShell>;
}
