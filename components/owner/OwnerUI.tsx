import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 border-b border-white/10 pb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-zinc-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  note,
  accent = false,
}: {
  label: string;
  value: string | number;
  note?: string;
  accent?: boolean;
}) {
  return (
    <div className="ars-kpi py-5">
      <p className="text-[11px] font-bold uppercase tracking-[.14em] text-zinc-500">{label}</p>
      <p className={`mt-3 text-3xl font-black ${accent ? 'text-[#d8c79e]' : 'text-white'}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-zinc-600">{note}</p>}
    </div>
  );
}

export function Panel({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ars-card min-w-0 border ${className}`}>
      <header className="border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-black uppercase tracking-[.12em] text-zinc-300">{title}</h2>
      </header>
      <div className="overflow-x-auto p-5">{children}</div>
    </section>
  );
}

export function Empty({
  title,
  copy,
  action,
}: {
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-2 py-10 text-center">
      <p className="text-lg font-black uppercase text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Bars({ values, unit = '₹', labels }: { values: number[]; unit?: string; labels?: string[] }) {
  const max = Math.max(1, ...values);
  if (!values.some(value => value > 0)) return <div className="flex h-44 items-center justify-center border-b border-white/10 text-sm text-zinc-400">No activity in this period</div>;
  return (
    <div role="img" aria-label={`Chart: ${values.map((v,i) => `${labels?.[i] || i+1}: ${unit}${v}`).join(', ')}`} className="relative flex h-44 items-end gap-2 border-b border-white/10 pt-8">
      {values.map((v, i) => (
        <div
          key={i}
          tabIndex={0} title={`${labels?.[i] || i+1}: ${unit}${v}`} className="group relative flex-1 border-t border-[#cbb88a] bg-[#cbb88a]/25 transition hover:bg-[#cbb88a]/45"
          style={{ height: `${(v / max) * 100}%` }}
        >
          <span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 text-[10px] text-zinc-400 group-hover:block group-focus:block">
            {unit}{v}
          </span>
        </div>
      ))}
    </div>
  );
}

export const tableClass = 'w-full min-w-[640px] text-left text-sm';
export const thClass = 'border-b border-white/10 px-4 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-zinc-400';
export const tdClass = 'border-b border-white/5 px-4 py-4 text-zinc-400';
