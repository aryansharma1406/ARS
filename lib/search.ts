export const normalizeSearch = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const searchTerms = (query: string) => normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
export function matchesSearch(query: string, values: (string | null | undefined)[]) {
  const text = normalizeSearch(values.filter(Boolean).join(' '));
  return searchTerms(query).every(term => text.includes(term));
}
