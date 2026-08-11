export function countBy<T extends string>(values: T[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

export function parseAnalyticsDateRange(fromValue: string | null, toValue: string | null) {
  const from = fromValue ? new Date(fromValue) : undefined;
  const to = toValue ? new Date(toValue) : undefined;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) throw new Error("Analytics dates must be valid ISO dates");
  if (from && to && from > to) throw new Error("Analytics from date must be before the to date");
  return { from, to };
}
