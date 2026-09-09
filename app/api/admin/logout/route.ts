import { logout } from '@/lib/auth-handlers';
export async function POST(request: Request) { return logout(request, '/admin/login'); }
