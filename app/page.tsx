import EventCard from '@/components/EventCard';
import FeaturedVenueSlider from '@/components/FeaturedVenueSlider';
import { getPublicCatalog } from '@/lib/catalog';
import CatalogUnavailable from '@/components/CatalogUnavailable';
import { ArrowDown, ArrowUpRight, CalendarDays, MapPin, ScanLine, ShieldCheck, Ticket } from 'lucide-react';
import CatalogImage from '@/components/CatalogImage';
import Link from 'next/link';

// Published events and the IST date must stay current after deployment.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { events, venues, issue } = await getPublicCatalog();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const tonight = events.filter(event => event.date === today);
  const upcoming = events.filter(event => event.date > today).sort((a, b) =>
    a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time) || a.id.localeCompare(b.id)
  );
  const locations = ['Goa', 'Jaipur'].map(name => ({
    name,
    events: events.filter(event => event.venue_location?.toLowerCase().includes(name.toLowerCase()) && event.date >= today),
  }));
  return <div className="hospitality-home">
    <section className="night-hero" aria-labelledby="night-title">
      <div className="night-hero-image"><CatalogImage src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=85&w=2000&auto=format&fit=crop" alt="An illuminated dance floor, alive after dark" priority sizes="100vw" className="object-cover" /></div>
      <div className="night-hero-shade" />
      <div className="night-hero-top"><span className="eyebrow">ARS Hospitality</span><span>Extraordinary places. Unforgettable nights.</span></div>
      <div className="night-hero-content">
        <p className="eyebrow hero-intro">For the nights that stay with you</p>
        <h1 id="night-title">Life begins<br/><em>after dark.</em></h1>
        <div className="night-hero-bottom"><p>Good company. Exceptional spaces.<br/>A night that becomes a story.</p><Link href="/events" className="ars-button">Explore events <ArrowUpRight size={18}/></Link></div>
      </div>
      <div className="night-hero-foot"><a href="#tonight">Step inside <ArrowDown size={15}/></a><span>Nightlife, considered.</span><span className="hero-coordinate">An ARS experience</span></div>
    </section>

    <section className="ars-section location-discovery" aria-label="Browse events by location">
      <div className="section-heading"><div><p className="eyebrow">Choose your city</p><h2>Where are you going out?</h2></div><Link href="/events" className="editorial-link">View all locations <ArrowUpRight size={16}/></Link></div>
      <div className="location-discovery-grid">{locations.map(location => <Link key={location.name} href={`/events?location=${encodeURIComponent(location.name)}`} className="location-discovery-card group">
        <div><p className="eyebrow"><MapPin size={13}/>{location.name}</p><h3>{location.name}</h3><p>{location.events.length ? `${location.events.length} event${location.events.length === 1 ? '' : 's'} currently available` : 'No events currently listed'}</p></div><ArrowUpRight className="location-discovery-arrow" size={22}/>
      </Link>)}</div>
    </section>

    <section className="ars-section brand-introduction" aria-label="The ARS experience"><p className="eyebrow">More than a night out</p><h2>The right room.<br/>The right people.<br/><em>Something unforgettable.</em></h2><div><p>We bring together the places, music and moments that make going out feel different. Discover your next night with ARS.</p><Link href="/events" className="editorial-link">Explore the experience <ArrowUpRight size={16}/></Link></div></section>

    <section id="tonight" className="ars-section night-edit">
      <div className="section-heading"><div><p className="eyebrow">01 / The evening edit</p><h2>On the guest list.</h2></div><Link href="/events" className="editorial-link">All events <ArrowUpRight size={16}/></Link></div>
      {issue ? <CatalogUnavailable issue={issue}/> : tonight.length ? <div className="space-y-6"><EventCard event={tonight[0]} featured/>{tonight.length > 1 && <div className="mobile-event-rail grid gap-6 md:grid-cols-2">{tonight.slice(1,3).map(event => <EventCard key={event.id} event={event}/>)}</div>}</div> : <div className="night-empty"><CalendarDays size={28} strokeWidth={1}/><div><p className="eyebrow">Tonight / The calendar is quiet</p><h3>A little anticipation.</h3><p>No published events tonight. Explore the calendar for your next night out.</p></div><Link href="/events" className="editorial-link">View the calendar <ArrowUpRight size={16}/></Link></div>}
    </section>

    <section id="venues" className="venue-section"><div className="ars-section">
      <div className="section-heading"><div><p className="eyebrow">02 / A sense of place</p><h2>Find your room.</h2></div><p className="section-note">Intimate corners. Electric dance floors.<br/>Discover the spaces behind the nights.</p></div>
      {issue ? <CatalogUnavailable issue={issue}/> : venues.length ? <FeaturedVenueSlider>{venues.map((venue,index) => <Link key={venue.id} href={'/events?venue=' + encodeURIComponent(venue.name)} className="venue-editorial-card group">
        <div className="venue-editorial-image"><CatalogImage src={venue.image} alt={venue.name} className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.035]" sizes="(max-width:640px) 100vw,(max-width:1280px) 50vw,33vw"/><span className="venue-index">ARS / {String(index+1).padStart(2,'0')}</span><span className="venue-arrow"><ArrowUpRight size={20}/></span></div>
        <div className="venue-editorial-copy"><p className="eyebrow"><MapPin size={12}/>{venue.location}</p><h3>{venue.name}</h3><p>{venue.address || 'Discover the events at this venue.'}</p><span className="editorial-link">Explore the venue <ArrowUpRight size={14}/></span></div>
      </Link>)}</FeaturedVenueSlider> : <div className="night-empty"><p>Our next venue announcements will appear here.</p></div>}
    </div></section>

    <section className="ars-section"><div className="section-heading"><div><p className="eyebrow">03 / Worth making plans for</p><h2>Next on the calendar.</h2></div><Link href="/events" className="editorial-link">Full line-up <ArrowUpRight size={16}/></Link></div>{issue ? <CatalogUnavailable issue={issue}/> : upcoming.length ? <div className="mobile-event-rail grid gap-6 md:grid-cols-2 lg:grid-cols-3">{upcoming.slice(0,3).map(event => <EventCard key={event.id} event={event}/>)}</div> : <div className="night-empty"><CalendarDays size={28} strokeWidth={1}/><div><h3>The next chapter is coming.</h3><p>New nights appear here as soon as they are announced.</p></div><Link href="/events" className="editorial-link">Explore events <ArrowUpRight size={16}/></Link></div>}</section>

    <section className="ars-section experience-story"><div className="experience-image"><CatalogImage src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80" alt="A crowd sharing a moment under concert lights" sizes="(max-width:768px) 100vw,50vw" className="object-cover"/><span>Made of moments.</span></div><div className="experience-copy"><p className="eyebrow">The ARS way</p><h2>Lose yourself<br/>in the moment.<br/><em>Not the details.</em></h2><p>From finding your kind of night to arriving at the door, the experience should feel effortless.</p><div className="experience-point"><ShieldCheck size={20} strokeWidth={1}/><div><h3>Your night, thoughtfully arranged.</h3><p>Clear event details, a choice of passes and a secure checkout.</p></div></div><div className="experience-point"><ScanLine size={20} strokeWidth={1}/><div><h3>One pass. Your way in.</h3><p>Your digital QR pass is ready in your account after payment is verified.</p></div></div><Link href="/account/tickets" className="editorial-link">Open My Pass <ArrowUpRight size={16}/></Link></div></section>

    <section className="ars-section guest-essentials"><div className="section-heading"><div><p className="eyebrow">Before the night begins</p><h2>A considered arrival.</h2></div><p className="section-note">Less planning. More being there.</p></div><div className="essentials-grid">{[
      {number:'01', title:'Find your night', copy:'Explore the line-up, discover the venue and choose an event that moves you.', href:'/events', label:'Discover events', Icon:CalendarDays},
      {number:'02', title:'Choose your access', copy:'Compare pass benefits, select your guests and review the total before paying.', href:'/events', label:'Explore passes', Icon:Ticket},
      {number:'03', title:'Meet us at the door', copy:'Bring your digital QR pass and matching photo ID. Check your event’s entry requirements.', href:'/account/tickets', label:'Your digital pass', Icon:ScanLine},
    ].map(({number,title,copy,href,label,Icon}) => <Link href={href} key={number} className="essential-card"><span className="essential-number">{number}</span><Icon size={26} strokeWidth={1}/><h3>{title}</h3><p>{copy}</p><span className="editorial-link">{label}<ArrowUpRight size={16}/></span></Link>)}</div></section>

    <section className="partnership-invitation"><div className="ars-section"><p className="eyebrow">For places with a point of view</p><h2>You set the scene.<br/><em>Let&apos;s make the night.</em></h2><div><p>Bring your venue to ARS. Event discovery, guest access and operations, built around your world.</p><Link href="/partner" className="ars-button">Partner with ARS <ArrowUpRight size={18}/></Link></div><p className="partner-existing">Already part of ARS? <Link href="/owner/login">Owner login</Link></p></div></section>
  </div>;
}
