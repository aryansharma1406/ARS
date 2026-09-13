'use server';
import {getSupabaseClient} from './supabase';
import {requireRole,requireVenueAccess} from './auth';
import {dbError} from './api';
import type {PassTier} from './pass-tiers';
export async function getEventPassTiers(eventId:string){
 const client=await getSupabaseClient();const {data,error}=await client.rpc('event_tier_availability',{target_event:eventId});dbError(error);
 return (data||[]) as PassTier[];
}
export async function getManagedPassTiers(eventId:string){
 const auth=await requireRole('admin','super_admin','venue_owner');
 const event=await auth.client.from('events').select('venue_id').eq('id',eventId).single();dbError(event.error);
 if(auth.role==='venue_owner')await requireVenueAccess(event.data!.venue_id);
 const tiers=await getEventPassTiers(eventId);
 const orders:{id:string;ticket_tier_id:string|null;quantity:number;subtotal:number}[]=[];
 for(let offset=0;;offset+=1000){const r=await auth.client.from('orders').select('id,ticket_tier_id,quantity,subtotal').eq('event_id',eventId).eq('payment_status','PAID').order('id').range(offset,offset+999);dbError(r.error);orders.push(...(r.data||[]));if((r.data||[]).length<1000)break;}
 const counts=new Map<string,number>();
 for(let offset=0;;offset+=1000){const r=await auth.client.from('tickets').select('id,ticket_tier_id').eq('event_id',eventId).eq('status','USED').order('id').range(offset,offset+999);dbError(r.error);for(const t of r.data||[])counts.set(t.ticket_tier_id,(counts.get(t.ticket_tier_id)||0)+1);if((r.data||[]).length<1000)break;}
 return tiers.map(t=>({...t,revenue:orders.filter(o=>o.ticket_tier_id===t.id).reduce((n,o)=>n+Number(o.subtotal),0),checkins:counts.get(t.id)||0}));
}
