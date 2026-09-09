import { beforeEach,afterEach,it,expect,vi } from 'vitest';
const runtime=vi.hoisted(()=>({create:vi.fn(),set:vi.fn(),cookies:[{name:'test-cookie',value:'token'}]}));
vi.mock('@supabase/ssr',()=>({createServerClient:runtime.create}));
vi.mock('next/headers',()=>({cookies:async()=>({getAll:()=>runtime.cookies,set:runtime.set})}));
import { getSupabaseClient,getServiceRoleSupabaseClient } from '@/lib/supabase';
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://test.supabase.co');vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY','test-anon');vi.stubEnv('NODE_ENV','production');
});
afterEach(()=>vi.unstubAllEnvs());
it('uses server-readable HttpOnly Secure same-site cookies and persists refresh cookie updates',async()=>{
 await getSupabaseClient();
 const options=runtime.create.mock.calls[0][2];
 expect(options.cookieOptions).toEqual({httpOnly:true,secure:true,sameSite:'lax',path:'/'});
 expect(options.cookies.getAll()).toEqual(runtime.cookies);
 options.cookies.setAll([{name:'refreshed',value:'next-token',options:{httpOnly:true}}]);
 expect(runtime.set).toHaveBeenCalledWith('refreshed','next-token',{httpOnly:true});
});
it('never substitutes anon credentials for a missing service secret',()=>{
 vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','');expect(()=>getServiceRoleSupabaseClient()).toThrow('Payment storage is not configured.');
});
it('does not create a placeholder identity client when configuration is absent',async()=>{
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','');await expect(getSupabaseClient()).rejects.toMatchObject({status:503});expect(runtime.create).not.toHaveBeenCalled();
});
