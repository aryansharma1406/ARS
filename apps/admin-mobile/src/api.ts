import {createClient,processLock} from '@supabase/supabase-js';
import {secureStorage} from './storage';
const url=process.env.EXPO_PUBLIC_SUPABASE_URL||'';
const key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY||'';
export const configured=url.startsWith('https://')&&!url.includes('YOUR_PROJECT')&&!!key&&!key.includes('YOUR_PUBLIC');
export const db=createClient(configured?url:'https://unconfigured.supabase.co',configured?key:'unconfigured',{
 auth:{storage:secureStorage,storageKey:'ars-admin-session',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,lock:processLock},
 global:{fetch:async(input,init)=>{const c=new AbortController();const abort=()=>c.abort();if(init?.signal?.aborted)abort();init?.signal?.addEventListener('abort',abort);const t=setTimeout(abort,15000);try{return await fetch(input,{...init,signal:c.signal});}finally{clearTimeout(t);init?.signal?.removeEventListener('abort',abort);}}}
});
export class AccessError extends Error {}
export async function rpc<T>(name:string,args:Record<string,unknown>={}):Promise<T>{
 const {data,error}=await db.rpc(name,args);
 if(error){if(['42501','PGRST301','PGRST303'].includes(error.code))throw new AccessError('Admin access ended. Please sign in again.');throw new Error(error.code==='22023'?error.message:'Unable to confirm the server response. Refresh before retrying.');}
 return data as T;
}
export type Row={id:string;customer_name:string;customer_email:string;customer_phone:string;event_name:string;venue_name:string;total:number;utr:string;submitted_at:string;state:string;reviewer_name?:string;reviewed_at?:string;expires_at:string};
export type Report={rows:Row[];total:number};
export type Stats={pending:number;pendingAmount:number;approved:number;rejected:number;tickets:number;serverTime:string};
export type Detail={state:string;order:{id:string;customer_name:string;customer_email:string;customer_phone:string;event_name:string;venue_name:string;quantity:number;ticket_type:string;subtotal:number;fees:number;total:number;payment_status:string;created_at:string;reservation_expires_at:string};payment:{utr:string;submitted_at:string;reviewer_name?:string;reviewed_at?:string;review_note?:string};tickets:{id:string;customer_name:string;ticket_type:string;status:string;scanned_at?:string}[];audit:{id:string;action:string;actor_name:string;created_at:string}[]};
export const money=(n:number)=>`INR ${Number(n).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const time=(s?:string)=>s?new Date(s).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}):'Not recorded';
