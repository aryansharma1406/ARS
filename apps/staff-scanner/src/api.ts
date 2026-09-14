import {createClient,processLock} from '@supabase/supabase-js';
import {secureStorage} from './storage';
import type {PendingScan,ScanResult,StaffContext,Stats} from './types';

const url=process.env.EXPO_PUBLIC_SUPABASE_URL||'';
const key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY||'';
export const configured=url.startsWith('https://')&&!url.includes('YOUR_PROJECT')&&!!key&&!key.includes('YOUR_PUBLIC');
export const supabase=createClient(configured?url:'https://unconfigured.supabase.co',configured?key:'unconfigured',{
 auth:{storage:secureStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,lock:processLock},
 global:{fetch:async(input,init)=>{const controller=new AbortController();const abort=()=>controller.abort();if(init?.signal?.aborted)abort();init?.signal?.addEventListener('abort',abort);const timeout=setTimeout(abort,12000);try{return await fetch(input,{...init,signal:controller.signal});}finally{clearTimeout(timeout);init?.signal?.removeEventListener('abort',abort);}}}
});
export class AccessError extends Error{}
function fail(error:{code?:string;message:string}):never{
 if(error.code==='42501'||error.code==='PGRST301'||error.code==='PGRST303')throw new AccessError('Staff access is unavailable. Ask your venue owner to check your assignment.');
 if(['PGRST202','42P01','42883'].includes(error.code||''))throw new Error('Mobile scanner setup is incomplete. Apply the ARS mobile scanner migration.');
 throw new Error('Could not confirm with ARS. Check your connection and retry.');
}
export async function loadContext():Promise<StaffContext>{const {data,error}=await supabase.rpc('mobile_staff_context');if(error)fail(error);return data as StaffContext;}
export async function loadStats(id:string):Promise<Stats>{const {data,error}=await supabase.rpc('mobile_staff_stats',{target_assignment:id});if(error)fail(error);return data as Stats;}
export async function submitScan(scan:PendingScan):Promise<ScanResult>{const {data,error}=await supabase.rpc('mobile_scan_ticket',{token:scan.token,assignment_id:scan.assignmentId,request_id:scan.requestId});if(error)fail(error);if(!data||!['VALID','ALREADY_USED','INVALID'].includes(data.result))throw new Error('No confirmed result received. Retry the same request.');return data as ScanResult;}
export const pendingKey=(id:string)=>`ars.pending.${id}`;
