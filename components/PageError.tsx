'use client';
export default function PageError({reset}:{error:Error;reset:()=>void}) {
 return <section role="alert" className="mx-auto my-16 max-w-3xl border-l-2 border-[#cbb88a] bg-[#111110] p-8 sm:p-12"><p className="eyebrow">ARS / Temporarily unavailable</p><h1 className="mt-5 text-3xl font-black uppercase sm:text-5xl">We couldn’t load this view.</h1><p className="mt-5 max-w-md text-sm leading-7 text-zinc-400">Please try again. If the problem continues, return later or contact your venue for assistance.</p><button onClick={reset} className="ars-button mt-7">Try again</button></section>;
}
