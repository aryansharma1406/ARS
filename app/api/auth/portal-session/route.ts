import {NextResponse} from 'next/server';
import {requireRole,AuthError} from '@/lib/auth';
import {apiError,checkOrigin,dbError} from '@/lib/api';
import {getSupabaseClient} from '@/lib/supabase';

export async function POST(request:Request){
  try{
    checkOrigin(request);
    const auth=await requireRole('venue_owner','admin','super_admin');
    const result=await auth.client.rpc('touch_portal_session');
    dbError(result.error);
    if(result.data!==true)throw new AuthError(401,'Session replaced. Please sign in again.','SESSION_REPLACED');
    return NextResponse.json({active:true},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    if(error instanceof AuthError&&error.code==='SESSION_REPLACED'){
      try{const client=await getSupabaseClient();await client.auth.signOut({scope:'local'});}catch{/* Server-side access remains denied even if Auth is unreachable. */}
    }
    return apiError(error);
  }
}
