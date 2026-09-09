import { NextResponse } from 'next/server';
import { validateAndScanTicket } from '@/lib/store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { qrToken, staffId } = body;

    if (!qrToken) {
      return NextResponse.json({ success: false, error: 'Missing QR Token or Ticket ID' }, { status: 400 });
    }

    const result = await validateAndScanTicket(qrToken.trim(), staffId || 'staff-001');

    return NextResponse.json({
      success: true,
      result: result.result,
      ticket: result.ticket,
      message: result.message,
    });
  } catch (error: any) {
    console.error('Error scanning ticket:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
