/** Keep authentication and its cookies on the explicitly configured application origin. */
export function customerAuthRedirect(currentUrl: string, appUrl?: string): string | null {
  if (!appUrl) return null;
  const current = new URL(currentUrl);
  const configured = new URL(appUrl);
  if (!['http:', 'https:'].includes(configured.protocol) || configured.username || configured.password) {
    throw new Error('Invalid application URL.');
  }
  if (current.origin === configured.origin) return null;
  const path = ['/login', '/signup', '/reset-password'].includes(current.pathname) ? current.pathname : '/login';
  const destination = new URL(path, configured.origin);
  destination.search = current.search;
  // Never forward fragments, credentials, or destinations supplied by request headers.
  return destination.toString();
}
