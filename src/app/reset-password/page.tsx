import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/token-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <AuthShell eyebrow="Choose a new password" title="Secure your account" description="Use at least 12 characters. Existing sessions will be revoked after the reset." footer={<Link href="/login">Return to sign in</Link>}><ResetPasswordForm token={token} /></AuthShell>;
}
