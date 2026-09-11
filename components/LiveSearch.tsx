'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { normalizeSearch, searchTerms } from '@/lib/search';

const SearchContext = createContext({ query: '', setQuery: (_value: string) => {} });
export const useLiveSearch = () => useContext(SearchContext);
export function LiveSearchProvider({ initialQuery = '', children }: { initialQuery?: string; children: ReactNode }) {
  const [query, setQuery] = useState(initialQuery);
  return <SearchContext.Provider value={{ query, setQuery }}>{children}</SearchContext.Provider>;
}
export function LiveSearchInput({ value, onChange, name, placeholder = 'Search', className = '' }: { value: string; onChange: (value: string) => void; name?: string; placeholder?: string; className?: string }) {
  return <div className={`relative min-w-0 ${className}`}>
    <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#cbb88a]"/>
    <input type="search" name={name} aria-label={placeholder} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} maxLength={150} autoComplete="off" className="ars-input !pl-10 !pr-16"/>
    {value && <button type="button" aria-label="Clear search" onClick={() => onChange('')} className="absolute right-2 top-1/2 min-h-10 -translate-y-1/2 px-2 text-xs text-[#e2d4ae] hover:text-white">Clear</button>}
  </div>;
}
export function CatalogSearchInput() {
  const { query, setQuery } = useLiveSearch();
  return <LiveSearchInput name="query" value={query} onChange={setQuery} placeholder="Search event or venue" className="lg:col-span-2"/>;
}
export function SearchHighlight({ children, query }: { children?: string | null; query?: string }) {
  const context = useLiveSearch();
  const terms = searchTerms(query ?? context.query);
  const value = children || '';
  if (!terms.length) return <>{value}</>;
  const characters = Array.from(value);
  let normalized = '';
  const positions: number[] = [];
  characters.forEach((character, index) => {
    const part = normalizeSearch(character);
    normalized += part;
    for (let i = 0; i < part.length; i++) positions.push(index);
  });
  const matched = new Set<number>();
  for (const term of terms) {
    let start = normalized.indexOf(term);
    while (start !== -1) {
      for (let i = start; i < start + term.length; i++) matched.add(positions[i]);
      start = normalized.indexOf(term, start + 1);
    }
  }
  const segments: { text: string; matched: boolean }[] = [];
  characters.forEach((character, index) => {
    const isMatch = matched.has(index);
    const previous = segments[segments.length - 1];
    if (previous && previous.matched === isMatch) previous.text += character;
    else segments.push({ text: character, matched: isMatch });
  });
  return <>{segments.map((segment, index) => segment.matched ? <mark key={index} className="rounded-sm bg-[#cbb88a]/25 text-[#ffe6a3] ring-1 ring-inset ring-[#cbb88a]/20">{segment.text}</mark> : segment.text)}</>;
}
