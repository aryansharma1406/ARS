export type AudienceFilters={search:string;venue:string;event:string;segment:string;city:string;minSpend:string;maxSpend:string;minVisits:string;activity:string;channel:string};
export const emptyAudience:AudienceFilters={search:'',venue:'all',event:'all',segment:'All',city:'',minSpend:'',maxSpend:'',minVisits:'',activity:'all',channel:'all'};
export type MarketingPreference={customer_id:string;city:string;phone:string;email:string;whatsapp:boolean;email_marketing:boolean;sms:boolean;updated_at:string};
export function optedIn(p:MarketingPreference|undefined,channel:string,email:string){return !!p&&(channel==='whatsapp'?p.whatsapp&&!!p.phone:channel==='sms'?p.sms&&!!p.phone:channel==='email'?p.email_marketing&&p.email.toLowerCase()===email.toLowerCase():false);}
