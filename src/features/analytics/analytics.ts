export function countBy<T extends string>(values: T[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

export function parseAnalyticsDateRange(fromValue: string | null, toValue: string | null) {
  const from = fromValue ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(fromValue) ? `${fromValue}T00:00:00.000Z` : fromValue) : undefined;
  const to = toValue ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(toValue) ? `${toValue}T23:59:59.999Z` : toValue) : undefined;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) throw new Error("Analytics dates must be valid ISO dates");
  if (from && to && from > to) throw new Error("Analytics from date must be before the to date");
  return { from, to };
}

export function percentage(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : null;
}

export function buildAnalyticsInsights(input: { candidates: number; resumes: number; evidence: number; interviews: Record<string, number>; offers: Record<string, number> }) {
  const decidedOffers = (input.offers.ACCEPTED ?? 0) + (input.offers.DECLINED ?? 0);
  return {
    offerAcceptanceRate: percentage(input.offers.ACCEPTED ?? 0, decidedOffers),
    interviewCompletionRate: percentage(input.interviews.COMPLETED ?? 0, Object.values(input.interviews).reduce((sum, count) => sum + count, 0)),
    resumesPerCandidate: input.candidates > 0 ? Number((input.resumes / input.candidates).toFixed(1)) : null,
    evidencePerCandidate: input.candidates > 0 ? Number((input.evidence / input.candidates).toFixed(1)) : null,
  };
}
