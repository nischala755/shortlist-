import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="EvidenceHire home">
      <span className="brand-mark" aria-hidden="true">E</span>
      <span>EvidenceHire</span>
    </Link>
  );
}
