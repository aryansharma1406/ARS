import 'server-only';
import { safeNext } from './api';

export function customerDestination(value: unknown) {
  const fallback = '/account/tickets';
  const path = safeNext(value, fallback);
  const url = new URL(path, 'https://ars.invalid');
  if (url.origin !== 'https://ars.invalid' || !/^\/(account|checkout|ticket|events)(\/|$)/.test(url.pathname)) return fallback;
  return url.pathname + url.search;
}

export function customerCallback(request: Request) {
  return new URL('/auth/customer/callback', process.env.NEXT_PUBLIC_APP_URL || request.url);
}
