import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export default function ForgotPasswordPage() {
  return <AuthShell eyebrow="Account recovery" title="Reset your password" description="Enter your account email and we will send a time-limited reset link." footer={<Link href="/login">Return to sign in</Link>}><AuthForm mode="forgot" /></AuthShell>;
}
