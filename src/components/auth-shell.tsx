import type { ReactNode } from "react";
import { Brand } from "./brand";

export function AuthShell({ eyebrow, title, description, children, footer }: { eyebrow: string; title: string; description: string; children: ReactNode; footer: ReactNode }) {
  return (
    <main className="auth-layout">
      <section className="auth-context" aria-label="Product context">
        <Brand />
        <div>
          <p className="eyebrow">Evidence over instinct</p>
          <h1>Keep every hiring decision explainable.</h1>
          <p>Organize resumes, interview feedback, and assessments against the requirements that matter.</p>
        </div>
        <p className="auth-note">AI can surface evidence. Your hiring team makes the decision.</p>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
          {children}
          <div className="auth-footer">{footer}</div>
        </div>
      </section>
    </main>
  );
}
