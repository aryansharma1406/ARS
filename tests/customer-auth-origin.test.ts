import { describe, expect, it } from 'vitest';
import { customerAuthRedirect } from '@/lib/customer-auth-origin';

describe('customer authentication canonical origin', () => {
  it('moves alternate local ports to the configured origin and preserves the booking destination', () => {
    expect(customerAuthRedirect('http://localhost:3001/login?next=%2Fcheckout%2Fevent%3Fqty%3D2', 'http://localhost:3000')).toBe('http://localhost:3000/login?next=%2Fcheckout%2Fevent%3Fqty%3D2');
  });
  it('moves loopback aliases to the same cookie origin', () => {
    expect(customerAuthRedirect('http://127.0.0.1:3000/login', 'http://localhost:3000')).toBe('http://localhost:3000/login');
  });
  it('does not loop on the configured origin', () => {
    expect(customerAuthRedirect('https://ars.example/login?next=%2Faccount%2Ftickets', 'https://ars.example/')).toBeNull();
  });
  it('preserves signup and recovery routes but drops URL fragments', () => {
    expect(customerAuthRedirect('http://localhost:3001/signup#private', 'http://localhost:3000')).toBe('http://localhost:3000/signup');
    expect(customerAuthRedirect('http://localhost:3001/reset-password', 'http://localhost:3000')).toBe('http://localhost:3000/reset-password');
  });
  it('uses only the configured host even when query parameters name another host', () => {
    const result = customerAuthRedirect('https://preview.example/login?origin=https://evil.example&next=//evil.example', 'https://ars.example');
    expect(new URL(result!).origin).toBe('https://ars.example');
  });
  it('retains the existing request-origin fallback when no application URL is configured', () => {
    expect(customerAuthRedirect('http://localhost:3000/login')).toBeNull();
  });
  it.each(['javascript:alert(1)', 'https://user:secret@ars.example', 'not-a-url'])('fails closed for invalid configured URL %s', value => {
    expect(() => customerAuthRedirect('https://preview.example/login', value)).toThrow();
  });
});
