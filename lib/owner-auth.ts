import 'server-only';
import { requireOwner as checkOwner,requirePage } from './auth';

export async function requireOwner() {
  return requirePage(checkOwner, '/owner/login', '/owner');
}
