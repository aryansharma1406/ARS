'use client';

import Link from 'next/link';
import { ArrowRight, Building2, CheckCircle2, Mail, Phone } from 'lucide-react';
import { FormEvent, useState } from 'react';

const venueTypes = ['Nightclub', 'Bar or lounge', 'Restaurant', 'Rooftop', 'Hotel', 'Live music venue', 'Event space', 'Other'];

export default function PartnerPage() {
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return <main className="ars-section flex min-h-[calc(100svh-74px)] items-center justify-center py-16">
      <section className="w-full max-w-2xl border border-[#cbb88a]/40 bg-[#11110f] p-8 text-center sm:p-14">
        <CheckCircle2 size={42} className="mx-auto text-[#cbb88a]" aria-hidden="true" />
        <p className="eyebrow mt-7">Partnership request received</p>
        <h1 className="mt-5 text-4xl font-black uppercase leading-none tracking-[-.06em] sm:text-6xl">We&apos;ll be in touch.</h1>
        <p className="mx-auto mt-6 max-w-lg text-sm leading-7 text-zinc-400 sm:text-base">Thanks for introducing your venue to ARS. Our partnerships team will review your details and contact you soon.</p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/" className="ars-button">Back to ARS</Link><a href="mailto:hello@ars.events" className="ars-button ars-button-secondary">Email our team</a></div>
      </section>
    </main>;
  }

  return <main>
    <section className="border-b border-white/10 bg-[radial-gradient(circle_at_82%_12%,rgba(203,184,138,.15),transparent_30rem)]">
      <div className="ars-section grid min-w-0 grid-cols-1 gap-12 pb-14 pt-20 lg:grid-cols-[1fr_.9fr] lg:items-end lg:pt-28">
        <div>
          <p className="eyebrow mb-6">Venue partnerships</p>
          <h1 className="max-w-3xl text-[clamp(3.3rem,8vw,7.5rem)] font-black uppercase leading-[.86] tracking-[-.075em]">Put your<br/><span className="text-[#e2d4ae]">venue on</span><br/>the list.</h1>
        </div>
        <div className="border-l border-[#cbb88a]/50 pl-6 sm:pl-8"><p className="max-w-lg text-base leading-7 text-zinc-300">ARS brings event sales, guest access and operational clarity together for venues that shape the city after dark.</p><p className="mt-5 text-sm leading-6 text-zinc-500">New to ARS? Tell us about your venue below. Existing ARS venue partners can use the <Link href="/owner/login" className="text-[#e2d4ae] underline underline-offset-4 hover:text-white">Owner Login</Link>.</p></div>
      </div>
    </section>

    <section className="ars-section grid gap-12 lg:grid-cols-[.72fr_1.28fr] lg:gap-20">
      <aside className="min-w-0 break-words">
        <p className="eyebrow mb-5">The next move</p>
        <h2 className="text-4xl font-black uppercase leading-[.94] tracking-[-.055em] sm:text-5xl">Start the conversation.</h2>
        <p className="mt-6 max-w-sm text-sm leading-7 text-zinc-400">Give us a sense of the room, the people and the nights you want to create. We&apos;ll take it from there.</p>
        <div className="mt-10 border-y border-white/10 py-6 text-sm">
          <a href="mailto:hello@ars.events?subject=ARS%20Venue%20Partnership" className="flex min-w-0 flex-wrap items-center gap-3 break-all py-3 text-zinc-300 transition hover:text-[#e2d4ae]"><Mail size={17} className="text-[#cbb88a]"/>hello@ars.events</a>
          <p className="flex items-start gap-3 py-3 leading-6 text-zinc-500"><Phone size={17} className="mt-1 shrink-0 text-[#cbb88a]"/>Prefer WhatsApp or a call? Include your number in the form and our partnerships team will contact you.</p>
        </div>
      </aside>

      <form onSubmit={submit} className="min-w-0 w-full border border-white/15 bg-[#0d0d0c] p-4 sm:p-9 [&_input]:min-w-0 [&_select]:min-w-0 [&_textarea]:min-w-0 [&_label]:min-w-0" aria-label="Venue partnership request">
        <div className="mb-8 flex items-center gap-3 border-b border-white/10 pb-6"><Building2 size={20} className="text-[#cbb88a]"/><p className="text-sm font-bold uppercase tracking-[.14em]">Your venue</p></div>
        <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="Venue name" name="venueName" required />
          <Field label="Owner or contact name" name="contactName" required />
          <Field label="Phone or WhatsApp" name="phone" type="tel" required />
          <Field label="Email" name="email" type="email" required />
          <Field label="City" name="city" required />
          <label><span className="ars-label">Venue type</span><select name="venueType" required defaultValue="" className="ars-select"><option value="" disabled>Select venue type</option>{venueTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
          <label className="sm:col-span-2"><span className="ars-label">About the venue</span><textarea name="message" required rows={6} className="ars-textarea resize-y" placeholder="Tell us about your space, capacity, programming and what makes it distinct." /></label>
        </div>
        <button type="submit" className="ars-button mt-8 w-full min-w-0 whitespace-normal sm:w-auto">Request partnership <ArrowRight size={16}/></button>
        <p className="mt-5 text-xs leading-5 text-zinc-500">By sending this request, you&apos;re asking the ARS partnerships team to contact you about your venue.</p>
      </form>
    </section>
  </main>;
}

function Field({ label, name, type = 'text', required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return <label><span className="ars-label">{label}</span><input className="ars-input" name={name} type={type} required={required} /></label>;
}
