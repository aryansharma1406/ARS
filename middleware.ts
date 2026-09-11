import { NextRequest, NextResponse } from 'next/server';

// Protected pages, route handlers and database policies each verify identity and
// role authoritatively. Keeping middleware network-free prevents every portal
// navigation from repeating those same remote checks before rendering begins.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'] };
