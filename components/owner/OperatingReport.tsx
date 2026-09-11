'use client';
import { useState } from 'react';
import { LiveSearchInput, SearchHighlight } from '@/components/LiveSearch';
import { matchesSearch } from '@/lib/search';

export default function OperatingReport({ title, columns, rows, filename = 'ARS-report.csv' }: { title: string; columns: string[]; rows: string[][]; filename?: string }) {
  const [search, setSearch] = useState('');
  const filtered = rows.filter(row => matchesSearch(search, row));
  function download() {
    const csv = [columns, ...filtered].map(row => row.map(value => {
      const safe = /^[=+@\-\t\r]/.test(value) ? `'${value}` : value;
      return `"${safe.replaceAll('"', '""')}"`;
    }).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], {type: 'text/csv;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="ars-card min-w-0 border border-white/10">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5"><h2 className="text-sm font-bold uppercase tracking-widest">{title}</h2><button type="button" onClick={download} className="ars-button ars-button-secondary !px-3 !py-2 !text-[10px]">Download statement / CSV</button></header>
    <div className="p-5"><LiveSearchInput value={search} onChange={setSearch} placeholder={`Search ${title.toLowerCase()}`}/><p role="status" className="my-3 text-xs text-zinc-500">{filtered.length} records</p><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead><tr>{columns.map(column => <th key={column} className="border-b border-white/10 px-3 py-4 text-[10px] uppercase tracking-wider text-zinc-500">{column}</th>)}</tr></thead><tbody>{filtered.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i} className="max-w-xs break-words border-b border-white/5 px-3 py-4 text-zinc-300"><SearchHighlight query={search}>{cell}</SearchHighlight></td>)}</tr>)}</tbody></table></div>{!filtered.length && <p className="py-8 text-center text-sm text-zinc-400">No records match this view.</p>}</div>
  </section>;
}
