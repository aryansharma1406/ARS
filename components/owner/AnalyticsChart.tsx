'use client';

import { useId } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);

export default function AnalyticsChart({ labels, values, kind }: { labels: string[]; values: number[]; kind: 'revenue' | 'entries' }) {
  const gradient = useId().replace(/:/g, '');
  const revenue = kind === 'revenue';
  const points = labels.map((label, index) => ({ label, value: values[index] || 0 }));
  const total = values.reduce((sum, value) => sum + value, 0);
  const peak = Math.max(0, ...values);
  const peakIndex = values.indexOf(peak);
  // Recharts must receive axes as chart children, not wrapped in a Fragment.
  const axes = [
    <CartesianGrid key="grid" stroke="#ffffff0d" vertical={false} strokeDasharray="3 5" />,
    <XAxis key="x" dataKey="label" tick={{ fill: '#c4c1b8', fontSize: 11 }} axisLine={{ stroke: '#ffffff20' }} tickLine={false} minTickGap={12} tickMargin={10} height={52} interval="preserveStartEnd" ticks={revenue ? undefined : labels.filter((_, index) => index % 3 === 0 || index === 23)} label={{ value: revenue ? 'Date' : 'Entry time (IST)', position: 'insideBottom', offset: 0, fill: '#96948e', fontSize: 11 }} />,
    <YAxis key="y" tick={{ fill: '#96948e', fontSize: 10 }} axisLine={false} tickLine={false} width={52} allowDecimals={revenue} domain={[0, revenue ? 'auto' : Math.max(1, peak)]} tickFormatter={value => revenue ? Number(value) >= 1000 ? `₹${Number(value) / 1000}k` : `₹${value}` : String(value)} />,
    <Tooltip key="tooltip" cursor={revenue ? { stroke: '#cbb88a', strokeDasharray: '4 4' } : { fill: '#ffffff06' }} content={({ active, payload, label }) => active && payload?.length ? <div className="border border-[#cbb88a]/40 bg-[#151512] px-4 py-3 shadow-xl"><p className="mb-1 text-xs text-zinc-400">{label}{!revenue ? ' IST' : ''}</p><p className="text-sm font-semibold text-[#e2d4ae]">{revenue ? money(Number(payload[0].value)) : `${payload[0].value} check-ins`}</p></div> : null} />,
  ];
  return <div className="min-w-0">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[10px] uppercase tracking-[.16em] text-zinc-500">{revenue ? 'Net ticket revenue' : 'Successful check-ins'}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-[#e2d4ae]">{revenue ? money(total) : total}</p></div>
      <div className="text-right"><p className="text-[10px] uppercase tracking-[.12em] text-zinc-500">{revenue ? 'Highest day' : 'Busiest hour'}</p><p className="mt-2 text-sm text-zinc-200">{peak > 0 ? `${labels[peakIndex]}${revenue ? '' : ' IST'}` : 'No activity yet'}</p></div>
    </div>
    {peak > 0 ? <div className="h-[260px] w-full sm:h-[290px]" role="img" aria-label={`${revenue ? 'Revenue trend' : 'Hourly check-ins'}: ${points.map(point => `${point.label}: ${revenue ? money(point.value) : point.value}`).join('; ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        {revenue ? <AreaChart data={points} margin={{ top: 12, right: 12, bottom: 8, left: 0 }} accessibilityLayer>
          <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#cbb88a" stopOpacity={0.35}/><stop offset="100%" stopColor="#cbb88a" stopOpacity={0.01}/></linearGradient></defs>
          {axes}<Area type="linear" dataKey="value" stroke="#d8c79e" strokeWidth={2.5} fill={`url(#${gradient})`} dot={{ r: 3, fill: '#d8c79e', stroke: '#111110', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#eadfc6' }} isAnimationActive={false}/>
        </AreaChart> : <BarChart data={points} margin={{ top: 12, right: 12, bottom: 8, left: 0 }} barCategoryGap="28%" accessibilityLayer>
          {axes}<Bar dataKey="value" radius={[4,4,0,0]} maxBarSize={28} isAnimationActive={false}>{points.map((point, index) => <Cell key={point.label} fill={index === peakIndex ? '#e2d4ae' : '#88794f'} />)}</Bar>
        </BarChart>}
      </ResponsiveContainer>
    </div> : <div className="flex h-[260px] flex-col items-center justify-center border border-dashed border-white/10 px-6 text-center sm:h-[290px]"><p className="text-sm font-medium text-zinc-300">{revenue ? 'No paid sales in this period' : 'No check-ins in this period'}</p><p className="mt-2 text-xs leading-6 text-zinc-500">{revenue ? 'Revenue will appear when a booking is paid.' : 'Successful QR scans will populate the hourly chart.'}</p></div>}
    <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-zinc-500">{revenue ? 'Daily paid ticket revenue after discounts, excluding processing fees.' : 'Grouped by scan time in IST. Repeat and rejected scans are excluded. Tied peaks highlight the first hour.'}</p>
  </div>;
}
