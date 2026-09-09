import { apiError,checkOrigin,jsonBody,onlyFields } from '@/lib/api';
import { AuthError,requireStaff } from '@/lib/auth';
import { validateAndScanTicket } from '@/lib/store';
import { NextResponse } from 'next/server';
export async function POST(request: Request) {
  try {
    checkOrigin(request); await requireStaff();
    const body = await jsonBody(request);
    onlyFields(body,['qrToken','assignmentId']);
    if (typeof body.qrToken !== 'string' || !body.qrToken.trim() || body.qrToken.length>200 || typeof body.assignmentId !== 'string') throw new AuthError(400,'A ticket token and scanner assignment are required.');
    const result = await validateAndScanTicket(body.qrToken.trim(),body.assignmentId);
    return NextResponse.json({success:result.result==='VALID',...result}, {status:result.result==='ALREADY_USED'?409:result.result==='INVALID'?400:200});
  } catch(error) { return apiError(error); }
}
