'use server';
import {requireAdmin} from './auth';
import {dbError} from './api';
import type {Order,Ticket,Event,Venue} from './types';
export type CustomerLocationRecord={customer_id:string;status:string;latitude:number|null;longitude:number|null;recorded_at:string;name:string;email:string;phone:string};
export async function getAdminCustomerCRM(){
  const {client}=await requireAdmin();
  const registrations=await client.from('users').select('id',{count:'exact',head:true}).eq('role','customer');
  dbError(registrations.error);
  async function read<T>(table:string,columns:string){const rows:T[]=[];for(let offset=0;;offset+=1000){const r=await client.from(table).select(columns).order('id').range(offset,offset+999);dbError(r.error);const page=(r.data||[]) as unknown as T[];rows.push(...page);if(page.length<1000)return rows;}}
  const orders=await read<Pick<Order,'id'|'customer_id'|'customer_name'|'customer_email'|'customer_phone'|'event_id'|'quantity'|'subtotal'|'payment_status'|'ticket_type'|'source_code'|'created_at'>>('orders','id,customer_id,customer_name,customer_email,customer_phone,event_id,quantity,subtotal,payment_status,ticket_type,source_code,created_at');
  const tickets=await read<Pick<Ticket,'id'|'order_id'|'event_id'|'status'|'scanned_at'>>('tickets','id,order_id,event_id,status,scanned_at');
  const events=await read<Pick<Event,'id'|'venue_id'|'name'|'date'>>('events','id,venue_id,name,date');
  const venues=await client.rpc('business_venues');dbError(venues.error);
  const locations:CustomerLocationRecord[]=[];
  let locationsUnavailable=false;
  for(let offset=0;;offset+=1000){
    const result=await client.from('customer_location_preferences').select('customer_id,status,latitude,longitude,recorded_at').order('customer_id').range(offset,offset+999);
    if(result.error){locationsUnavailable=true;locations.length=0;break;}
    const rows=result.data||[];
    if(rows.length){
      const people=await client.from('users').select('id,name,email,phone').eq('role','customer').in('id',rows.map(r=>r.customer_id));
      if(people.error){locationsUnavailable=true;locations.length=0;break;}
      const peopleById=new Map((people.data||[]).map(p=>[p.id,p]));
      for(const row of rows){const person=peopleById.get(row.customer_id);if(!person)continue;locations.push({...row,latitude:row.latitude===null?null:Number(row.latitude),longitude:row.longitude===null?null:Number(row.longitude),name:person.name||'Name not recorded',email:person.email||'',phone:person.phone||''});}
    }
    if(rows.length<1000)break;
  }
  return {orders,tickets,events,venues:((venues.data||[]) as Venue[]).map(v=>({id:v.id,name:v.name})),registeredCustomers:registrations.count,asOf:Date.now(),locations,locationsUnavailable};
}
