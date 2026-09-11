type Schedule = { date: string; start_time: string; end_time: string };
export type EventPhase = 'upcoming' | 'live' | 'past' | 'unscheduled';

// Event wall-clock times are stored in IST, independently of server/browser timezone.
export function eventWindow(event: Schedule) {
  const date = event.date?.slice(0, 10);
  const start = Date.parse(`${date}T${event.start_time || '00:00:00'}+05:30`);
  let end = Date.parse(`${date}T${event.end_time || '23:59:59'}+05:30`);
  if (end <= start) end += 24 * 60 * 60 * 1000;
  return { start, end };
}

export function eventPhase(event: Schedule, now: number): EventPhase {
  const { start, end } = eventWindow(event);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'unscheduled';
  return now >= end ? 'past' : now >= start ? 'live' : 'upcoming';
}

export function matchesEventStatus(event: Schedule & { published: boolean }, status: string, now: number) {
  if (status === 'published') return event.published;
  if (status === 'draft') return !event.published;
  if (['upcoming', 'live', 'past'].includes(status)) return eventPhase(event, now) === status;
  return true;
}
