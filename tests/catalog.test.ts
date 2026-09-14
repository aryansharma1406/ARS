import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const store=vi.hoisted(()=>({getEvents:vi.fn(),getVenues:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabaseConfig:()=>({url:'https://test.invalid',key:'test-anon'})}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({from:(table:string)=>({select:()=>({eq:()=>table==='events'?store.getEvents():store.getVenues()})})})}));
import {getPublicCatalog} from '@/lib/catalog';
import {AuthError} from '@/lib/auth-errors';
import {apiError,dbError} from '@/lib/api';
beforeEach(()=>{vi.resetAllMocks();store.getEvents.mockResolvedValue({data:[],error:null});store.getVenues.mockResolvedValue({data:[],error:null});vi.spyOn(console,'warn').mockImplementation(()=>{});});
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
it.each(['PGRST200','PGRST202','PGRST205','42P01','42703','42883'])('identifies incomplete schema errors (%s) without exposing backend details',code=>{
 let thrown:unknown;try{dbError({code,message:'private database details'});}catch(error){thrown=error;}
 expect(thrown).toMatchObject({status:503,code:'DATABASE_SETUP_REQUIRED'});expect((thrown as Error).message).not.toContain('private database details');expect(apiError(thrown).status).toBe(503);
});
it('provides a setup state for public browsing while the schema is missing',async()=>{store.getEvents.mockResolvedValue({data:null,error:{code:'42P01'}});expect(await getPublicCatalog()).toEqual({events:[],venues:[],issue:'setup'});});
it('shows outages as unavailable, not as a legitimately empty catalog',async()=>{store.getEvents.mockResolvedValue({data:null,error:{code:'08006'}});expect((await getPublicCatalog()).issue).toBe('unavailable');});
it('bounds public catalog latency when the data service stalls',async()=>{vi.useFakeTimers();store.getEvents.mockReturnValue(new Promise(()=>{}));const result=getPublicCatalog();await vi.advanceTimersByTimeAsync(10000);await expect(result).resolves.toEqual({events:[],venues:[],issue:'unavailable'});});
it('shows authorization denials explicitly and does not suppress programming errors',async()=>{
 store.getEvents.mockRejectedValue(new AuthError(403,'Denied'));expect(await getPublicCatalog()).toEqual({events:[],venues:[],issue:'permissions'});
 const error=new Error('Unexpected failure');store.getEvents.mockRejectedValue(error);await expect(getPublicCatalog()).rejects.toBe(error);
});
it('keeps valid empty and populated catalogs distinguishable from failures',async()=>{
 expect(await getPublicCatalog()).toEqual({events:[],venues:[],issue:null});
 store.getEvents.mockResolvedValue({data:[{id:'event-a',venue_id:'venue-a'}],error:null});store.getVenues.mockResolvedValue({data:[{id:'venue-a',name:'Venue',address:'Address'}],error:null});
 expect(await getPublicCatalog()).toEqual({events:[{id:'event-a',venue_id:'venue-a',venue_name:'Venue, Address'}],venues:[{id:'venue-a',name:'Venue',address:'Address'}],issue:null});
});
it('returns a typed private 429 response',()=>{const response=apiError(new AuthError(429,'Try later.'));expect(response.status).toBe(429);expect(response.headers.get('cache-control')).toContain('no-store');});
