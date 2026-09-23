import {NextResponse} from 'next/server';
import {requireAdmin,AuthError} from '@/lib/auth';
import {apiError,dbError} from '@/lib/api';
import {paymentLabel} from '@/lib/manual-upi';
import type {UpiReport} from '@/lib/admin-upi-types';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(request:Request){
 try{
  const {client}=await requireAdmin();const params=new URL(request.url).searchParams;
  const id=params.get('id');
  if(id){
   if(!uuid.test(id))throw new AuthError(400,'Invalid order.');
   const {data,error}=await client.rpc('admin_upi_details',{target_order:id});dbError(error);
   return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});
  }
  const filters:Record<string,string|number>={};
  for(const key of ['q','status','venue','event','approver','range','from','to','min','max','sort'])if(params.has(key))filters[key]=params.get(key)!;
  for(const key of ['venue','event','approver'])if(filters[key]&&!uuid.test(String(filters[key])))throw new AuthError(400,'Invalid filter.');
  for(const key of ['min','max'])if(filters[key]&&!/^\d{1,12}(\.\d{1,2})?$/.test(String(filters[key])))throw new AuthError(400,'Enter a valid amount.');
  for(const key of ['from','to'])if(filters[key]&&!/^\d{4}-\d{2}-\d{2}$/.test(String(filters[key])))throw new AuthError(400,'Enter a valid date.');
  filters.page=Number(params.get('page')||0);filters.size=Number(params.get('size')||25);
  if(!Number.isInteger(filters.page)||Number(filters.page)<0||!Number.isInteger(filters.size)||Number(filters.size)<1||Number(filters.size)>100)throw new AuthError(400,'Invalid pagination.');
  async function read(){const {data,error}=await client.rpc('admin_upi_search',{filters});if(error?.code==='22023')throw new AuthError(400,error.message);dbError(error);return data as UpiReport;}
  if(params.get('format')==='csv'||params.get('format')==='pdf-data'){
   // Export one database snapshot rather than paging through changing statuses.
   filters.page=0;filters.size=10001;
   const first=await read();
   // Return a clear limit rather than silently truncating an export.
   if(first.total>10000)throw new AuthError(400,'Narrow the filters to 10,000 payments or fewer before exporting.');
   if(params.get('format')==='pdf-data')return NextResponse.json(first,{headers:{'Cache-Control':'private, no-store'}});
   const rows=first.rows;
   const cell=(value:unknown)=>{let text=String(value??'');if(/^[\s]*[=+@\-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
   const lines=[['Order ID','Customer','Email','Phone','Event','Venue','Amount INR','UTR','Submitted UTC','Status','Hold expiry UTC','Approver','Reviewed UTC'],...rows.map(row=>[row.id,row.customer_name,row.customer_email,row.customer_phone,row.event_name,row.venue_name,row.total,row.utr,row.submitted_at,paymentLabel(row.state),row.expires_at,row.reviewer_name||row.reviewed_by,row.reviewed_at])];
   return new Response('\ufeff'+lines.map(line=>line.map(cell).join(',')).join('\r\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="ARS-UPI-payments.csv"','Cache-Control':'private, no-store'}});
  }
  return NextResponse.json(await read(),{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return apiError(error);}
}
