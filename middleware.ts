import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const area = /^\/(owner|admin|staff)(?:\/|$)/.exec(path)?.[1];
  const protectedPage = Boolean((area && path !== `/${area}/login`) || /^\/(ticket|account|checkout)(?:\/|$)/.test(path));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  const finish = (result: NextResponse) => {
    response.cookies.getAll().forEach(cookie => result.cookies.set(cookie));
    result.headers.set('Cache-Control', 'private, no-store');
    return result;
  };
  if (!url || !key || url.includes('your-project')) {
    return protectedPage ? new NextResponse('Authentication is not configured.', { status: 503 }) : response;
  }
  const client = createServerClient(url, key, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: values => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user }, error } = await client.auth.getUser();
  if (!protectedPage) return finish(response);
  if (error || !user) {
    const login = new URL(area ? `/${area}/login` : '/login', request.url);
    login.searchParams.set('next', path + request.nextUrl.search);
    return finish(NextResponse.redirect(login));
  }
  const { data: profile, error: profileError } = await client.from('users').select('role,active').eq('id', user.id).maybeSingle();
  if (profileError) return finish(new NextResponse('Account verification unavailable.', { status: 503 }));
  const roles = area === 'admin' ? ['admin','super_admin'] : area === 'owner' ? ['venue_owner'] : area === 'staff' ? ['staff'] : path.startsWith('/ticket/') ? ['customer','admin','super_admin'] : ['customer'];
  if (!profile?.active || !roles.includes(profile.role)) return finish(new NextResponse('Access denied.', { status: 403 }));
  // Assignment checks are repeated by server pages, actions, APIs and database functions.
  return finish(response);
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'] };
