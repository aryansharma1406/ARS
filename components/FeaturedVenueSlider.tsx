'use client';

import { Children, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function FeaturedVenueSlider({ children }: { children: ReactNode }) {
  const cards = Children.toArray(children);
  const pages = Array.from({ length: Math.ceil(cards.length / 6) }, (_, index) => cards.slice(index * 6, index * 6 + 6));
  const viewport = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const current = Math.min(page, Math.max(0, pages.length - 1));

  function goTo(index: number) {
    const element = viewport.current;
    if (!element) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollTo({ left: index * element.clientWidth, behavior: reduceMotion ? 'instant' : 'smooth' });
  }

  return <div role="region" aria-label="Featured venues" aria-roledescription="carousel">
    <div ref={viewport} id="featured-venue-slides" className="flex snap-x snap-mandatory items-start overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      onScroll={() => {
        const element = viewport.current;
        if (element?.clientWidth) setPage(Math.round(element.scrollLeft / element.clientWidth));
      }}>
      {pages.map((items, index) => <div key={index} role="group" aria-roledescription="slide" aria-label={'Slide ' + (index + 1) + ' of ' + pages.length}
        aria-hidden={index !== current} inert={index !== current}
        className="grid w-full shrink-0 snap-start grid-cols-1 gap-5 p-1 sm:grid-cols-2 xl:grid-cols-3">
        {items}
      </div>)}
    </div>
    {pages.length > 1 && <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
      <p aria-live="polite" aria-atomic="true" className="text-xs tracking-wide text-zinc-400">
        Venues {current * 6 + 1}–{Math.min((current + 1) * 6, cards.length)} <span className="text-zinc-600">/ {cards.length}</span>
      </p>
      <div className="flex items-center gap-3">
        <button type="button" aria-label="Previous six venues" aria-controls="featured-venue-slides" disabled={current === 0} onClick={() => goTo(current - 1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#cbb88a]/40 text-[#cbb88a] transition-colors hover:bg-[#cbb88a] hover:text-black disabled:cursor-not-allowed disabled:opacity-25"><ArrowLeft size={18}/></button>
        <span className="min-w-12 text-center text-xs tabular-nums text-zinc-400">{current + 1} / {pages.length}</span>
        <button type="button" aria-label="Next six venues" aria-controls="featured-venue-slides" disabled={current === pages.length - 1} onClick={() => goTo(current + 1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#cbb88a]/40 text-[#cbb88a] transition-colors hover:bg-[#cbb88a] hover:text-black disabled:cursor-not-allowed disabled:opacity-25"><ArrowRight size={18}/></button>
      </div>
    </div>}
  </div>;
}
