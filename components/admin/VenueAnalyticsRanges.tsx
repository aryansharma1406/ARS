'use client';

import type {ReactNode} from 'react';
import {useSearchParams} from 'next/navigation';

type Range = 7 | 30 | 90;
const ranges:Range[]=[7,30,90];
const selectedRange=(value:string|null):Range=>value==='7'?7:value==='90'?90:30;

export default function VenueAnalyticsRanges({panels}:{panels:Record<Range,ReactNode>}){
  const params=useSearchParams();
  return <>{panels[selectedRange(params.get('days'))]}</>;
}

export function VenueAnalyticsRangeButtons(){
  const params=useSearchParams();
  const days=selectedRange(params.get('days'));
  function select(value:Range){
    if(value===days)return;
    const url=new URL(window.location.href);
    url.searchParams.set('days',String(value));
    window.history.pushState(null,'',url.pathname+url.search+url.hash);
  }
  return <div className="flex flex-wrap gap-2" aria-label="Analytics date range">
    {ranges.map(value=><button key={value} type="button" aria-pressed={days===value}
      onClick={()=>select(value)} className={`ars-button ${days===value?'':'ars-button-secondary'}`}>
      {value} days
    </button>)}
  </div>;
}
