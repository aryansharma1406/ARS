'use server';
import {requireAdmin} from './auth';
import {dbError} from './api';
import type {Ticket,Order,Event,Venue,Scan} from './types';
export async function getAdminTicketReport() {
  const {client}=await requireAdmin();
  async function read<T>(table:string,columns:string):Promise<T[]> {
    const rows:T[]=[];
    for(let offset=0;;offset+=1000){const result=await client.from(table).select(columns).order('id').range(offset,offset+999);dbError(result.error);const page=(result.data||[]) as unknown as T[];rows.push(...page);if(page.length<1000)return rows;}
  }
  const tickets=await read<Ticket>('tickets','*');
  const orders=await read<Order>('orders','*');
  const events=await read<Pick<Event,'id'|'name'|'venue_id'>>('events','id,name,venue_id');
  const venues=await client.rpc('business_venues');dbError(venues.error);
  return {tickets,orders,events,venues:(venues.data||[]) as Venue[]};
}
export async function getAdminTicketScans(ticketId:string) {
  const {client}=await requireAdmin();
  const rows:(Scan&{gate_name?:string})[]=[];
  for(let offset=0;;offset+=1000){
    const result=await client.from('scans').select('*').eq('ticket_id',ticketId).order('id').range(offset,offset+999);dbError(result.error);
    rows.push(...(result.data||[]) as (Scan&{gate_name?:string})[]);
    if((result.data||[]).length<1000)return rows.sort((a,b)=>b.scanned_at.localeCompare(a.scanned_at));
  }
}
