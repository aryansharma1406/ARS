import {NextResponse} from 'next/server';
import {requireAdmin,AuthError} from '@/lib/auth';
import {apiError,checkOrigin,jsonBody,onlyFields,dbError} from '@/lib/api';
import type {ManualPayment,ManualPayments,PaymentQueue} from '@/lib/manual-upi';
export async function GET(request:Request){
 try{
  const {client}=await requireAdmin();const url=new URL(request.url);const page=Number(url.searchParams.get('page')||0);
  if(!Number.isInteger(page)||page<0)throw new AuthError(400,'Invalid page.');
  const queue=url.searchParams.get('queue')||'pending';
  if(!['pending','approved','rejected','expired'].includes(queue))throw new AuthError(400,'Invalid payment queue.');
  // Retain the RPC's database-clock expiry and authorization rules. Filter the
  // full result before pagination so history cannot hide pending submissions.
  const all:ManualPayment[]=[];let settings:ManualPayments|undefined;
  for(let index=0;;index++){
   const {data,error}=await client.rpc('manual_upi_list',{page_number:index});dbError(error);
   settings=data as ManualPayments;all.push(...settings.rows);
   if(settings.rows.length<50)break;
  }
  const queues:Record<PaymentQueue,ManualPayment[]>={pending:[],approved:[],rejected:[],expired:[]};
  for(const row of all){
   if(!row.utr||!row.submitted_at)continue;
   if(row.state==='PENDING')queues.pending.push(row);
   else if(row.state==='VERIFIED'||row.state==='REFUNDED')queues.approved.push(row);
   else if(row.state==='REJECTED')queues.rejected.push(row);
   else if(row.state==='EXPIRED')queues.expired.push(row);
  }
  queues.pending.sort((a,b)=>Date.parse(a.submitted_at!)-Date.parse(b.submitted_at!));
  const matching=queues[queue as PaymentQueue];const rows=matching.slice(page*50,(page+1)*50);
  if(rows.length){
   const ids=rows.map(row=>row.id);const reviewers=[...new Set(rows.map(row=>row.reviewed_by).filter((id):id is string=>Boolean(id)))];
   const venues=await client.from('orders').select('id,events(venues(name))').in('id',ids);dbError(venues.error);
   const people=reviewers.length?await client.from('users').select('id,name').in('id',reviewers):{data:[],error:null};dbError(people.error);
   const tickets:{order_id:string;status:string}[]=[];
   for(let offset=0;;offset+=1000){
    const result=await client.from('tickets').select('id,order_id,status').in('order_id',ids).order('id').range(offset,offset+999);dbError(result.error);
    tickets.push(...(result.data||[]));if((result.data||[]).length<1000)break;
   }
   for(const row of rows){
    const order=venues.data?.find(order=>order.id===row.id);
    const event=Array.isArray(order?.events)?order.events[0]:order?.events;
    const venue=Array.isArray(event?.venues)?event.venues[0]:event?.venues;
    row.venue_name=venue?.name||'Venue unavailable';
    row.reviewer_name=people.data?.find(person=>person.id===row.reviewed_by)?.name||row.reviewed_by||'Not recorded';
    const passes=tickets.filter(ticket=>ticket.order_id===row.id);
    row.pass_status=passes.length?`${passes.length} guest entries issued · ${passes.filter(ticket=>ticket.status==='VALID').length} unused · ${passes.filter(ticket=>ticket.status==='USED').length} checked in · ${passes.filter(ticket=>!['VALID','USED'].includes(ticket.status)).length} inactive`:'No pass issued';
   }
  }
  return NextResponse.json({...settings,rows,counts:{pending:queues.pending.length,approved:queues.approved.length,rejected:queues.rejected.length,expired:queues.expired.length},hasMore:(page+1)*50<matching.length},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return apiError(error);}
}
export async function POST(request:Request){
 try{
  checkOrigin(request);const {client}=await requireAdmin();const body=await jsonBody(request);
  onlyFields(body,['orderId','approve','note','holdMinutes']);
  let error;
  if(body.holdMinutes!==undefined){
   if(Object.keys(body).length!==1||!Number.isInteger(body.holdMinutes)||Number(body.holdMinutes)<5||Number(body.holdMinutes)>1440)throw new AuthError(400,'Choose 5 to 1440 minutes.');
   ({error}=await client.rpc('set_manual_upi_hold',{minutes:body.holdMinutes}));
  }else{
   if(typeof body.orderId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.orderId)||typeof body.approve!=='boolean'||(body.note!==undefined&&typeof body.note!=='string'))throw new AuthError(400,'Provide a valid order and review decision.');
   const enteredNote=typeof body.note==='string'?body.note.trim():'';
   // Preserve the existing database audit contract without requiring the admin
   // to type a note for approval. Rejection still requires an explicit reason.
   const reviewNote=body.approve&&!enteredNote?'Payment manually approved. No additional review note provided.':enteredNote;
   ({error}=await client.rpc('review_manual_upi',{target_order:body.orderId,approve:body.approve,note:reviewNote}));
  }
  if(error?.code==='22023')throw new AuthError(400,error.message);
  dbError(error);return NextResponse.json({success:true},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return apiError(error);}
}
