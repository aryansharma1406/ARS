import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ oauth: vi.fn(), exchange: vi.fn(), signOut: vi.fn(), recover: vi.fn(), update: vi.fn(), role: vi.fn(), fetch: vi.fn() }));
const client = vi.hoisted(() => ({ auth: { signInWithOAuth: state.oauth, exchangeCodeForSession: state.exchange, signOut: state.signOut, resetPasswordForEmail: state.recover, updateUser: state.update } }));
vi.mock('@/lib/supabase', () => ({ getSupabaseClient: async () => client, supabaseConfig: () => ({ url: 'https://project.supabase.co', key: 'anon-key' }) }));
vi.mock('@/lib/auth', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/auth')>(), requireRole: state.role }));
import { POST as google } from '@/app/api/auth/google/route';
import { GET as callback } from '@/app/auth/customer/callback/route';
import { POST as forgot } from '@/app/api/auth/forgot-password/route';
import { POST as reset } from '@/app/api/auth/reset-password/route';
import { customerDestination } from '@/lib/customer-auth';
import { AuthError } from '@/lib/auth-errors';

const request = (body: unknown, origin = 'https://ars.example') => new Request('https://ars.example/api/auth/google', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://ars.example');
  vi.stubGlobal('fetch', state.fetch);
  state.fetch.mockResolvedValue({ ok: true, json: async () => ({ external: { google: true } }) });
  state.oauth.mockResolvedValue({ data: { url: 'https://project.supabase.co/auth/v1/authorize?provider=google' }, error: null });
  state.exchange.mockResolvedValue({ error: null });
  state.signOut.mockResolvedValue({ error: null });
  state.recover.mockResolvedValue({ error: null });
  state.update.mockResolvedValue({ error: null });
  state.role.mockResolvedValue({ client });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('customer OAuth initiation', () => {
  it('rejects cross-origin requests before contacting the provider', async () => {
    expect((await google(request({}, 'https://evil.example'))).status).toBe(403);
    expect(state.fetch).not.toHaveBeenCalled(); expect(state.oauth).not.toHaveBeenCalled();
  });
  it('reports a disabled Google provider without making a fake session', async () => {
    state.fetch.mockResolvedValue({ ok: true, json: async () => ({ external: { google: false } }) });
    const response = await google(request({}));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'GOOGLE_NOT_CONFIGURED' });
    expect(state.oauth).not.toHaveBeenCalled();
  });
  it('uses the existing Supabase server client and preserves the customer return destination', async () => {
    const response = await google(request({ next: '/checkout/event?qty=2&source=host' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    const options = state.oauth.mock.calls[0][0];
    expect(options.provider).toBe('google'); expect(options.options.skipBrowserRedirect).toBe(true);
    const redirect = new URL(options.options.redirectTo);
    expect(redirect.origin).toBe('https://ars.example'); expect(redirect.pathname).toBe('/auth/customer/callback');
    expect(redirect.searchParams.get('next')).toBe('/checkout/event?qty=2&source=host');
  });
  it('does not redirect when Supabase cannot start OAuth', async () => {
    state.oauth.mockResolvedValue({ data: { url: null }, error: new Error('provider failure') });
    expect((await google(request({}))).status).toBe(503);
  });
  it('rejects client-supplied role and provider overrides', async () => {
    expect((await google(request({ provider: 'google', role: 'admin' }))).status).toBe(400);
    expect(state.oauth).not.toHaveBeenCalled();
  });
});

describe('OAuth callback and redirects', () => {
  it.each(['https://evil.example', '//evil.example', '/\\evil.example', '/owner', '/events/../admin', '/%2f%2fevil.example'])('rejects unsafe or noncustomer destination %s', value => {
    expect(customerDestination(value)).toBe('/account/tickets');
  });
  it('exchanges the code before validating an active customer and navigating', async () => {
    const response = await callback(new Request('https://ars.example/auth/customer/callback?code=valid&next=%2Faccount%2Ftickets&sb_flow_id=flow-1'));
    expect(state.exchange).toHaveBeenCalledWith('valid', { flowId: 'flow-1' });
    expect(state.role).toHaveBeenCalledWith('customer');
    expect(response.headers.get('location')).toBe('https://ars.example/account/tickets');
  });
  it('signs out a disallowed role instead of granting customer access', async () => {
    state.role.mockRejectedValue(new AuthError(403, 'Role denied'));
    const response = await callback(new Request('https://ars.example/auth/customer/callback?code=valid'));
    expect(state.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(response.headers.get('location')).toContain('error=customer_access');
  });
  it('rejects an expired or invalid PKCE code without checking a pre-existing session', async () => {
    state.exchange.mockResolvedValue({ error: new Error('invalid verifier') });
    const response = await callback(new Request('https://ars.example/auth/customer/callback?code=expired'));
    expect(response.headers.get('location')).toContain('error=auth_callback'); expect(state.role).not.toHaveBeenCalled();
  });
  it('handles provider cancellation without reflecting untrusted provider error text', async () => {
    const response = await callback(new Request('https://ars.example/auth/customer/callback?error=access_denied&error_description=untrusted'));
    expect(response.headers.get('location')).toContain('error=oauth_cancelled');
    expect(response.headers.get('location')).not.toContain('untrusted'); expect(state.exchange).not.toHaveBeenCalled();
  });
  it('requires a code and keeps the callback redirect on the configured origin', async () => {
    const response = await callback(new Request('https://evil.example/auth/customer/callback?next=//evil.example'));
    expect(response.headers.get('location')).toMatch(/^https:\/\/ars.example\/login\?/);
    expect(state.exchange).not.toHaveBeenCalled();
  });
});

describe('customer password recovery', () => {
  it('sends recovery through Supabase and returns an account-neutral response', async () => {
    const response = await forgot(request({ email: 'customer@example.com' }));
    expect(response.status).toBe(200);
    expect(state.recover).toHaveBeenCalledWith('customer@example.com', { redirectTo: 'https://ars.example/auth/customer/callback?flow=recovery' });
    expect((await response.json()).message).toContain('If an account exists');
  });
  it('rejects cross-origin reset requests', async () => {
    expect((await forgot(request({ email: 'customer@example.com' }, 'https://evil.example'))).status).toBe(403);
    expect(state.recover).not.toHaveBeenCalled();
  });
  it('routes a verified customer recovery exchange to the password form', async () => {
    const response = await callback(new Request('https://ars.example/auth/customer/callback?code=recovery&flow=recovery'));
    expect(response.headers.get('location')).toBe('https://ars.example/reset-password'); expect(state.role).toHaveBeenCalledWith('customer');
  });
  it('never updates an anonymous or noncustomer password', async () => {
    state.role.mockRejectedValue(new AuthError(403, 'Role denied'));
    expect((await reset(request({ password: 'new-long-password' }))).status).toBe(403);
    expect(state.update).not.toHaveBeenCalled();
  });
  it('enforces the existing minimum length before updating through Supabase', async () => {
    expect((await reset(request({ password: 'short' }))).status).toBe(400);
    expect(state.update).not.toHaveBeenCalled();
    expect((await reset(request({ password: 'new-long-password' }))).status).toBe(200);
    expect(state.update).toHaveBeenCalledWith({ password: 'new-long-password' });
  });
});
