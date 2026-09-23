import type {Ticket} from './types';
// During staged deployment, preserve existing passes until the group migration
// is installed. Never suppress permission, network or other database errors.
export function missingGroupPassSchema(error:{code?:string;message?:string}|null):boolean{
 return !!error && (error.code==='42P01'||error.code==='PGRST205') && /group_passes/.test(error.message||'');
}
export type GroupPassRow={id:string;order_id:string;customer_name:string;qr_token:string;purchased_quantity:number;checked_in_quantity:number;remaining_quantity:number};
// Collapse only presentation, never the underlying guest attendance ledger.
export function customerPasses(tickets:Ticket[],groups:GroupPassRow[]):Ticket[]{
 const byOrder=new Map(groups.map(g=>[g.order_id,g]));const seen=new Set<string>();
 return tickets.flatMap(ticket=>{
  const group=byOrder.get(ticket.order_id);if(!group)return [ticket];
  if(seen.has(group.id))return [];seen.add(group.id);
  return [{...ticket,group_id:group.id,qr_token:group.qr_token,customer_name:group.customer_name,
   purchased_quantity:group.purchased_quantity,checked_in_quantity:group.checked_in_quantity,remaining_quantity:group.remaining_quantity,
   status:ticket.status==='REFUNDED'||ticket.status==='PAYMENT_FAILED'?ticket.status:group.remaining_quantity===0?'USED':'VALID'}];
 });
}
