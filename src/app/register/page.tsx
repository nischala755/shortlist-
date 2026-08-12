import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export default function RegisterPage() {
  return <AuthShell eyebrow="Create your account" title="Set up your hiring workspace" description="Begin with your work email. You will verify it before accessing hiring data." footer={<>Already have an account? <Link href="/login">Sign in</Link></>}><AuthForm mode="register" /></AuthShell>;
}
