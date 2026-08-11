export type EvidenceGapRequirement = { id: string; title: string; description: string };
export type EvidenceGapEvidence = { id: string; jobRequirementId: string | null };

export function buildEvidenceGapReport(requirements: EvidenceGapRequirement[], evidence: EvidenceGapEvidence[]) {
  const evidenceByRequirement = new Map<string, string[]>();
  for (const item of evidence) {
    if (!item.jobRequirementId) continue;
    const current = evidenceByRequirement.get(item.jobRequirementId) ?? [];
    current.push(item.id);
    evidenceByRequirement.set(item.jobRequirementId, current);
  }

  const requirementResults = requirements.map((requirement) => {
    const evidenceIds = evidenceByRequirement.get(requirement.id) ?? [];
    return { ...requirement, status: evidenceIds.length > 0 ? "COVERED" as const : "MISSING" as const, evidenceCount: evidenceIds.length, evidenceIds };
  });
  const coveredCount = requirementResults.filter((requirement) => requirement.status === "COVERED").length;
  return {
    requirements: requirementResults,
    gaps: requirementResults.filter((requirement) => requirement.status === "MISSING"),
    summary: {
      totalRequirements: requirements.length,
      coveredRequirements: coveredCount,
      missingRequirements: requirements.length - coveredCount,
      coveragePercent: requirements.length === 0 ? 0 : Math.round((coveredCount / requirements.length) * 100),
    },
  };
}
