import { apiError,checkOrigin,jsonBody,onlyFields } from '@/lib/api';
import { requireOwner,requireVenueAccess } from '@/lib/auth';
import { addEvent,getEvents,updateEvent } from '@/lib/store';
import type { Event } from '@/lib/types';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const owner = await requireOwner();
    const venueId = new URL(request.url).searchParams.get('venueId') || owner.venueIds[0];
    await requireVenueAccess(venueId);
    return NextResponse.json({ events: await getEvents(venueId) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireOwner();
    const body = await jsonBody(request);
    onlyFields(body, ['venue_id', 'name', 'description', 'image', 'category', 'date', 'start_time', 'end_time', 'ticket_price', 'ticket_capacity', 'age_limit', 'published']);
    const event = await addEvent(body as unknown as Omit<Event,'id'|'created_at'|'tickets_sold'>);
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    checkOrigin(request);
    await requireOwner();
    const body = await jsonBody(request);
    if (Object.keys(body).length === 0) {
      return apiError(new Error('No update data provided.') as never);
    }

    onlyFields(body, [
      'id',
      'venue_id',
      'name',
      'description',
      'image',
      'category',
      'date',
      'start_time',
      'end_time',
      'ticket_price',
      'ticket_capacity',
      'age_limit',
      'published',
    ]);

    await requireVenueAccess(String(body.venue_id || ''));
    const event = await updateEvent(String(body.id || ''), {
      name: body.name as string | undefined,
      description: body.description as string | undefined,
      image: body.image as string | undefined,
      category: body.category as string | undefined,
      date: body.date as string | undefined,
      start_time: body.start_time as string | undefined,
      end_time: body.end_time as string | undefined,
      ticket_price: body.ticket_price as number | undefined,
      ticket_capacity: body.ticket_capacity as number | undefined,
      age_limit: body.age_limit as number | undefined,
      published: body.published as boolean | undefined,
    }, String(body.venue_id));

    return NextResponse.json({ event });
  } catch (error) {
    return apiError(error);
  }
}
