import Link from "next/link";
import { Brand } from "@/components/brand";

const features = [
  { number: "01", title: "Evidence Matrix", copy: "Connect each job requirement to resume details, assessments, and interview feedback." },
  { number: "02", title: "Structured interviews", copy: "Give interviewers a consistent scorecard and preserve the reasoning behind every review." },
  { number: "03", title: "Human-led AI", copy: "Use AI to summarize and surface gaps without automating hiring or rejection decisions." },
];

export default function HomePage() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#principles">Principles</a>
          <Link href="/login">Sign in</Link>
          <Link className="button primary small" href="/register">Start hiring</Link>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">A clearer way to shortlist</p>
            <h1>Hiring decisions grounded in evidence.</h1>
            <p className="hero-lead">EvidenceHire helps hiring teams turn scattered resumes, interviews, and assessments into a review process they can explain.</p>
            <div className="hero-actions"><Link className="button primary" href="/register">Create your workspace</Link><a className="text-link" href="#product">See how it works <span aria-hidden="true">↓</span></a></div>
          </div>
          <div className="evidence-preview" aria-label="Example candidate evidence summary">
            <div className="preview-heading"><div><span className="avatar">AK</span><div><strong>Ananya K.</strong><small>Senior frontend candidate</small></div></div><span className="status-chip">In review</span></div>
            <div className="requirement"><span>React architecture</span><strong>Strong evidence</strong><div className="meter"><i style={{ width: "88%" }} /></div><small>Resume · Interview</small></div>
            <div className="requirement"><span>Team leadership</span><strong>Supported</strong><div className="meter"><i style={{ width: "66%" }} /></div><small>Interview scorecard</small></div>
            <div className="requirement"><span>Cloud deployment</span><strong className="gap">Evidence gap</strong><div className="meter gap-meter"><i style={{ width: "28%" }} /></div><small>Follow-up suggested</small></div>
            <p className="preview-note"><span aria-hidden="true">◇</span> Evidence status is reviewed by the hiring team.</p>
          </div>
        </section>

        <section className="trust-strip" aria-label="Product principles"><span>Requirement-led review</span><span>Organization-isolated data</span><span>Human decision ownership</span><span>Traceable workflow history</span></section>

        <section className="feature-section" id="product">
          <div className="section-heading"><p className="eyebrow">Built around the decision</p><h2>One hiring record, from application to offer.</h2><p>Keep evidence close to the requirement it supports, without reducing people to a score.</p></div>
          <div className="feature-grid">{features.map((feature) => <article key={feature.number}><span>{feature.number}</span><h3>{feature.title}</h3><p>{feature.copy}</p></article>)}</div>
        </section>

        <section className="principle-section" id="principles"><div><p className="eyebrow">A deliberate boundary</p><h2>AI assists. People decide.</h2></div><div className="principle-list"><p><strong>Grounded output</strong><span>Resume evidence quotes must exist in the source document.</span></p><p><strong>No automated rejection</strong><span>Application stages move only through authorized human actions.</span></p><p><strong>Visible gaps</strong><span>Missing evidence becomes a follow-up question—not an assumption.</span></p></div></section>

        <section className="cta-section"><p className="eyebrow">Start with one role</p><h2>Build a shortlist your team can stand behind.</h2><Link className="button light" href="/register">Create an account</Link></section>
      </main>

      <footer className="site-footer"><Brand /><p>Evidence-driven recruitment, with humans in control.</p><span>© 2026 EvidenceHire</span></footer>
    </div>
  );
}
