import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export default function LoginPage() {
  return <AuthShell eyebrow="Welcome back" title="Sign in to your workspace" description="Use your verified work email to continue." footer={<>New to EvidenceHire? <Link href="/register">Create an account</Link> · <Link href="/verify-email">Resend verification</Link></>}><AuthForm mode="login" /></AuthShell>;
}
