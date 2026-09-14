import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {getServiceRoleSupabaseClient} from '@/lib/supabase';
import {AuthError} from '@/lib/auth-errors';
import {dbError} from '@/lib/api';

export const isBusinessRole=(role:string)=>['venue_owner','admin','super_admin'].includes(role);

// Only call with the access token returned directly by successful Supabase login.
// Decoding extracts its session identifier; it is not used to verify identity.
export async function registerPortalSession(userId:string,accessToken:string,portal:'owner'|'admin',request:Request){
  let sessionId:unknown;
  try{sessionId=JSON.parse(Buffer.from(accessToken.split('.')[1],'base64url').toString('utf8')).session_id;}
  catch{throw new AuthError(503,'Sign-in session could not be registered.');}
  if(typeof sessionId!=='string'||!/^[0-9a-f-]{36}$/i.test(sessionId))throw new AuthError(503,'Sign-in session could not be registered.');
  const service=getServiceRoleSupabaseClient();
  const result=await service.rpc('register_portal_session',{target_user:userId,target_session:sessionId,target_portal:portal,agent:(request.headers.get('user-agent')||'').slice(0,512)});
  dbError(result.error);
}

export async function assertPortalSession(client:SupabaseClient){
  const result=await client.rpc('portal_session_valid');
  dbError(result.error);
  if(result.data!==true)throw new AuthError(401,'This session ended because you signed in elsewhere or signed out. Please sign in again.','SESSION_REPLACED');
}

export async function recordPortalLogout(client:SupabaseClient){
  const {data:{user}}=await client.auth.getUser();
  if(!user)return;
  const {data:profile}=await client.from('users').select('role').eq('id',user.id).maybeSingle();
  if(profile&&isBusinessRole(profile.role)){
    const result=await client.rpc('end_portal_session');
    dbError(result.error);
  }
}
