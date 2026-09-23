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
export class ScannerError extends Error{}
export class AccessError extends ScannerError{}
function fail(error:{code?:string;message:string}):never{
 if(error.code==='42501'||error.code==='PGRST301'||error.code==='PGRST303')throw new AccessError('Staff access is unavailable. Ask your venue owner to check your assignment.');
 const code=error.code&&/^[A-Z0-9]{5,12}$/.test(error.code)?` (${error.code})`:'';
 if(['PGRST202','42P01','42883'].includes(error.code||''))throw new ScannerError(`Mobile scanner database setup is incomplete${code}. Ask your administrator to apply the scanner migrations to this Supabase project, then retry this same scan.`);
 if(error.code==='22023')throw new ScannerError('The server rejected this scan request (22023). Contact ARS support before retrying.');
 if(error.code)throw new ScannerError(`ARS could not confirm this scan${code}. Contact your administrator with this code. The ticket has not been confirmed for entry.`);
 throw new ScannerError('Could not reach ARS. Check your internet connection and retry this same scan.');
}
export async function loadContext():Promise<StaffContext>{const {data,error}=await supabase.rpc('mobile_staff_context');if(error)fail(error);return data as StaffContext;}
export async function loadStats(id:string):Promise<Stats>{const {data,error}=await supabase.rpc('mobile_staff_stats',{target_assignment:id});if(error)fail(error);return data as Stats;}
export async function submitScan(scan:PendingScan):Promise<ScanResult>{const {data,error}=await supabase.rpc(scan.quantity===undefined?'mobile_scan_ticket':'check_in_group',{token:scan.token,assignment_id:scan.assignmentId,request_id:scan.requestId,...(scan.quantity===undefined?{}:{quantity:scan.quantity})});if(error)fail(error);if(!data||!['VALID','ALREADY_USED','INVALID','GROUP_READY'].includes(data.result))throw new ScannerError('ARS returned an unrecognized scan response. Ask your administrator to check the mobile scanner database version. Retry only this same request.');return data as ScanResult;}
export const pendingKey=(id:string)=>`ars.pending.${id}`;
