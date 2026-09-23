import {apiError,checkOrigin,jsonBody,onlyFields,dbError} from '@/lib/api';
import {AuthError,requireStaff} from '@/lib/auth';
import {NextResponse} from 'next/server';
export async function POST(request:Request){
 try{
  checkOrigin(request);const staff=await requireStaff();const body=await jsonBody(request);
  onlyFields(body,['qrToken','assignmentId','requestId','quantity']);
  if(typeof body.qrToken!=='string'||!body.qrToken.trim()||body.qrToken.length>200||typeof body.assignmentId!=='string'||typeof body.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId)||!Number.isSafeInteger(body.quantity)||Number(body.quantity)<1)throw new AuthError(400,'A valid group request and entering quantity are required.');
  if(!staff.assignments.some(a=>a.id===body.assignmentId))throw new AuthError(403,'Scanner assignment access denied.');
  const {data,error}=await staff.client.rpc('check_in_group',{token:body.qrToken.trim(),assignment_id:body.assignmentId,request_id:body.requestId,quantity:body.quantity});
  dbError(error);return NextResponse.json(data);
 }catch(error){return apiError(error);}
}
