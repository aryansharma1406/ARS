import {timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {getServiceRoleSupabaseClient} from '@/lib/supabase';
export const runtime='nodejs';
export const dynamic='force-dynamic';
// Invoke from a trusted scheduler. No user-facing endpoint can enqueue arbitrary pushes.
export async function POST(request:Request){
 const secret=process.env.ARS_PUSH_CRON_SECRET;
 const supplied=request.headers.get('authorization')||'';
 const expected=`Bearer ${secret}`;
 if(!secret||secret.length<32||supplied.length!==expected.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return NextResponse.json({error:'Unauthorized'},{status:401});
 const client=getServiceRoleSupabaseClient();
 const headers:Record<string,string>={'Content-Type':'application/json'};
 if(process.env.EXPO_ACCESS_TOKEN)headers.Authorization=`Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
 async function expo(path:string,body:unknown){const response=await fetch(`https://exp.host/--/api/v2/push/${path}`,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error('Push service unavailable');return response.json();}
 async function finish(id:number,values:Record<string,unknown>){const {error}=await client.from('admin_push_jobs').update(values).eq('id',id);if(error)throw error;}
 try{
  // Process provider receipts, including tokens invalidated after initial acceptance.
  const receipts=await client.from('admin_push_jobs').select('id,token,receipt_id,sent_at').eq('done',false).not('receipt_id','is',null).lt('sent_at',new Date(Date.now()-60000).toISOString()).limit(100);
  if(receipts.error)throw receipts.error;
  if(receipts.data?.length){const result=await expo('getReceipts',{ids:receipts.data.map(r=>r.receipt_id)});for(const row of receipts.data){const receipt=result.data?.[row.receipt_id];if(receipt){if(receipt.details?.error==='DeviceNotRegistered'){const removed=await client.from('admin_push_devices').delete().eq('token',row.token);if(removed.error)throw removed.error;}else await finish(row.id,{done:true});}else if(Date.now()-Date.parse(row.sent_at)>86400000)await finish(row.id,{done:true});}}
  const claimed=await client.rpc('claim_admin_push');if(claimed.error)throw claimed.error;
  const jobs=claimed.data as {id:number;token:string}[];
  if(jobs.length){const result=await expo('send',jobs.map(j=>({to:j.token,title:'ARS Admin',body:'A new UPI payment needs review.',sound:'default',channelId:'payments',data:{screen:'pending'},ttl:3600})));
   if(!Array.isArray(result.data))throw new Error('Invalid push response');
   for(let i=0;i<jobs.length;i++){const ticket=result.data[i];if(ticket?.status==='ok'&&ticket.id)await finish(jobs[i].id,{receipt_id:ticket.id,sent_at:new Date().toISOString()});else if(ticket?.details?.error==='DeviceNotRegistered'){const removed=await client.from('admin_push_devices').delete().eq('token',jobs[i].token);if(removed.error)throw removed.error;}}
  }
  return NextResponse.json({accepted:jobs.length},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Notification delivery incomplete; retry on next scheduled run.'},{status:503});}
}
