import {NextResponse} from 'next/server';
import {requireRole,AuthError} from '@/lib/auth';
import {apiError,checkOrigin,jsonBody,onlyFields,dbError} from '@/lib/api';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(request:Request){
 try{
  const {client}=await requireRole('customer');
  const url=new URL(request.url);const id=url.searchParams.get('order');const page=Number(url.searchParams.get('page')||0);
  if(id&&!uuid.test(id))throw new AuthError(400,'Invalid order.');
  if(!Number.isInteger(page)||page<0)throw new AuthError(400,'Invalid page.');
  const {data,error}=await client.rpc('manual_upi_list',{target_order:id,page_number:page});dbError(error);
  return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return apiError(error);}
}
export async function POST(request:Request){
 try{
  checkOrigin(request);const {client}=await requireRole('customer');const body=await jsonBody(request);onlyFields(body,['orderId','utr']);
  if(typeof body.orderId!=='string'||!uuid.test(body.orderId)||typeof body.utr!=='string')throw new AuthError(400,'Enter an order and UTR.');
  const {error}=await client.rpc('submit_manual_upi',{target_order:body.orderId,reference:body.utr});
  if(error?.code==='23505')throw new AuthError(409,'This UTR has already been submitted. Use the original order or contact ARS.');
  if(error?.code==='22023')throw new AuthError(400,error.message);
  dbError(error);return NextResponse.json({success:true},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return apiError(error);}
}
