import Link from 'next/link';
import {requireRole} from '@/lib/auth';
import {dbError} from '@/lib/api';

type LoginRecord={id:string;account_name:string;account_email:string;account_role:string;portal:string;user_agent:string;started_at:string;last_seen_at:string;ended_at:string|null;status:string;current_session:boolean};
function device(agent:string){
  const browser=/Edg\//.test(agent)?'Edge':/OPR\//.test(agent)?'Opera':/Firefox|FxiOS/.test(agent)?'Firefox':/Chrome|CriOS/.test(agent)?'Chrome / Chromium':/Safari/.test(agent)?'Safari':'Browser not reported';
  const os=/iPhone|iPad/.test(agent)?'iOS':/Android/.test(agent)?'Android':/Windows/.test(agent)?'Windows':/Macintosh/.test(agent)?'macOS':/Linux/.test(agent)?'Linux':'Device not reported';
  return `${browser} / ${os}`;
}
const stamp=(value:string|null)=>value?new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}):'-';
export default async function LoginActivity({portal,page:rawPage,venue}:{portal:'owner'|'admin';page?:string;venue?:string}){
  const auth=portal==='owner'?await requireRole('venue_owner'):await requireRole('admin','super_admin');
  const parsed=Number(rawPage||1);
  const page=Number.isInteger(parsed)&&parsed>=1&&parsed<=10000?parsed:1;
  const result=await auth.client.rpc('portal_login_activity',{row_offset:(page-1)*100});
  dbError(result.error);
  const records=(result.data||[]) as LoginRecord[];
  const rows=records.slice(0,100);
  const href=(target:number)=>{const q=new URLSearchParams({page:String(target)});if(venue&&portal==='owner')q.set('venue',venue);return `/${portal}/login-activity?${q}`;};
  return <section className="space-y-6"><header className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">ARS / Account security</p><h1 className="mt-3 text-3xl font-bold">Login Activity</h1></div><Link href={href(page)} prefetch={false} className="ars-button ars-button-secondary">Refresh history</Link></header>
    <p className="text-sm leading-7 text-zinc-400">{portal==='admin'?'Successful Owner and Admin logins across ARS.':'Successful logins for your owner account across all assigned venues.'} One active session per account. A new login replaces the previous session. Times are in IST.</p>
    <div className="ars-card overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead><tr className="border-b border-white/10 bg-white/[.025] text-[10px] uppercase tracking-widest text-zinc-400">{['Account','Portal','Login time (IST)','Browser / device','Last seen (IST)','Status','Ended (IST)'].map(label=><th key={label} className="px-4 py-4">{label}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-b border-white/5"><td className="px-4 py-4"><p className="font-semibold text-[#e2d4ae]">{row.account_name||'Name not recorded'}</p><p className="mt-1 text-xs text-zinc-500">{row.account_email}</p></td><td className="px-4 py-4 capitalize">{row.portal}</td><td className="px-4 py-4 text-xs">{stamp(row.started_at)}</td><td className="px-4 py-4 text-xs" title={row.user_agent}>{device(row.user_agent)}</td><td className="px-4 py-4 text-xs">{stamp(row.last_seen_at)}</td><td className="px-4 py-4"><span className={`rounded-sm border px-2 py-1 text-xs ${row.status==='active'?'border-emerald-500/30 text-emerald-300':'border-white/15 text-zinc-400'}`}>{row.current_session&&row.status==='active'?'This session':row.status==='replaced'?'Replaced by new login':row.status==='signed_out'?'Signed out':row.status==='expired'?'Expired / revoked':'Active'}</span></td><td className="px-4 py-4 text-xs">{stamp(row.ended_at)}</td></tr>)}</tbody></table>{!rows.length&&<p className="p-10 text-center text-sm text-zinc-400">No login records on this page. Recording starts after this feature is enabled.</p>}</div>
    <div className="flex items-center justify-between text-xs text-zinc-400">{page>1?<Link className="ars-button ars-button-secondary" href={href(page-1)}>Previous</Link>:<span/>}<span>Page {page}</span>{records.length>100?<Link className="ars-button ars-button-secondary" href={href(page+1)}>Next</Link>:<span/>}</div>
    <p className="text-xs leading-6 text-zinc-500">Active means the authorized session, not proof the person is online. Last seen updates while the portal is open. Browser/device labels are approximate, supplied by the browser. No passwords, OTPs or access tokens are stored in this history. Failed login attempts and logins before rollout are not included.</p>
  </section>;
}
