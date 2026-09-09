import { login } from '@/lib/auth-handlers';
export async function POST(request: Request) { return login(request, 'staff'); }
