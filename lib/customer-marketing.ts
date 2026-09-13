'use server';
import {requireAdmin,requireRole} from './auth';
import {dbError} from './api';
import {getAdminCustomerCRM} from './admin-customer-crm';
import {emptyAudience,type AudienceFilters,type MarketingPreference} from './marketing-rules';
function failure(error:{code?:string}|null){if(error&&['42P01','PGRST205','PGRST202','42883'].includes(error.code||''))throw new Error('Marketing setup required: apply supabase/migrations/202609130001_customer_marketing.sql in Supabase SQL Editor.');dbError(error);}
export async function getMarketingData(){
 const {client}=await requireAdmin();const crm=await getAdminCustomerCRM();
 async function read<T>(table:string,columns:string){const rows:T[]=[];for(let offset=0;;offset+=1000){const r=await client.from(table).select(columns).range(offset,offset+999).order(table==='customer_marketing_preferences'?'customer_id':'id');failure(r.error);const values=(r.data||[]) as unknown as T[];rows.push(...values);if(values.length<1000)return rows;}}
 const customers=await read<{id:string;name:string;email:string;phone:string;role:string;active:boolean;created_at:string}>('users','id,name,email,phone,role,active,created_at');
 const preferences=await read<MarketingPreference>('customer_marketing_preferences','customer_id,city,phone,email,whatsapp,email_marketing,sms,updated_at');
 const audiences=await read<{id:string;name:string;filters:AudienceFilters;created_at:string}>('marketing_audiences','id,name,filters,created_at');
 const campaigns=await read<{id:string;name:string;audience_id:string;channel:string;status:string;created_at:string}>('marketing_campaigns','id,name,audience_id,channel,status,created_at');
 const deliveries=await read<{id:string;campaign_id:string;customer_id:string;event:string}>('marketing_delivery_events','id,campaign_id,customer_id,event');
 return {crm,customers:customers.filter(c=>c.role==='customer').map(c=>({...c,email:c.email || '',phone:c.phone || ''})),preferences,audiences,campaigns,deliveries};
}
export async function saveAudience(name:string,input:AudienceFilters){
 const auth=await requireAdmin();if(!name.trim()||name.length>120)throw new Error('Enter an audience name of up to 120 characters.');
 const filters={...emptyAudience};for(const key of Object.keys(filters) as (keyof AudienceFilters)[]){if(typeof input[key]!=='string'||input[key].length>200)throw new Error('Invalid audience filter.');filters[key]=input[key];}
 for(const key of ['minSpend','maxSpend','minVisits'] as const)if(filters[key]&&(!Number.isFinite(Number(filters[key]))||Number(filters[key])<0))throw new Error('Enter nonnegative numeric filters.');
 if(filters.minSpend&&filters.maxSpend&&Number(filters.minSpend)>Number(filters.maxSpend))throw new Error('Minimum spend cannot exceed maximum spend.');
 const r=await auth.client.from('marketing_audiences').insert({name:name.trim(),filters,created_by:auth.userId});failure(r.error);
}
export async function saveCampaign(input:{name:string;audience_id:string;channel:string;subject:string;body:string}){
 const auth=await requireAdmin();if(!input.name.trim()||input.name.length>120||!['whatsapp','email','sms'].includes(input.channel)||!input.body.trim()||input.body.length>5000||input.subject.length>200)throw new Error('Enter a campaign name, channel and message (up to 5,000 characters).');
 const r=await auth.client.from('marketing_campaigns').insert({name:input.name.trim(),audience_id:input.audience_id,channel:input.channel,subject:input.subject,body:input.body,status:'draft',created_by:auth.userId});failure(r.error);
}
export async function getMyMarketing(){const auth=await requireRole('customer');const r=await auth.client.from('customer_marketing_preferences').select('customer_id,city,phone,email,whatsapp,email_marketing,sms,updated_at').eq('customer_id',auth.userId).maybeSingle();failure(r.error);return {email:auth.email,preference:r.data as MarketingPreference|null};}
export async function saveMyMarketing(input:{city:string;phone:string;whatsapp:boolean;email_marketing:boolean;sms:boolean}){
 const auth=await requireRole('customer');if(typeof input.city!=='string'||typeof input.phone!=='string'||[input.whatsapp,input.email_marketing,input.sms].some(v=>typeof v!=='boolean'))throw new Error('Invalid preferences.');
 const r=await auth.client.rpc('save_customer_marketing',{city_value:input.city,phone_value:input.phone.trim(),whatsapp_value:input.whatsapp,email_value:input.email_marketing,sms_value:input.sms});if(r.error?.code==='22023')throw new Error(r.error.message);failure(r.error);
}
