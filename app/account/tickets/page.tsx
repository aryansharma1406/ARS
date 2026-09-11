import { requirePage, requireRole } from '@/lib/auth';
import { getCustomerTickets } from '@/lib/store';
import type { Event } from '@/lib/types';
import MemberPassCollection from '@/components/MemberPassCollection';

export const dynamic = 'force-dynamic';

export default async function MyTickets({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const customer = await requirePage(() => requireRole('customer'), '/login', '/account/tickets');
  const tickets = await getCustomerTickets(customer);
  const ids = [...new Set(tickets.map(ticket => ticket.event_id))];
  const result = ids.length ? await customer.client.from('events').select('id,name,image,date,start_time,end_time,venues(name)').in('id', ids) : null;
  const events = new Map<string, Event>();
  // Optional event enrichment never changes ticket ownership or hides a purchased pass.
  for (const row of result?.data || []) {
    const venue = Array.isArray(row.venues) ? row.venues[0] : row.venues;
    events.set(row.id, { ...row, venue_name: venue?.name } as unknown as Event);
  }
  const params = await searchParams;
  return <MemberPassCollection
    key={JSON.stringify(params)}
    customer={{ name: customer.name, email: customer.email, userId: customer.userId }}
    tickets={tickets.map(({ qr_token, ...ticket }) => ticket)}
    eventList={[...events.values()]}
    params={params}
    eventDetailsUnavailable={Boolean(result?.error)}
    now={Date.now()}
  />;
}
