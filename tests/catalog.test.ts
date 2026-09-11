import {beforeEach,expect,it,vi} from 'vitest';
const store=vi.hoisted(()=>({getEvents:vi.fn(),getVenues:vi.fn()}));
vi.mock('@/lib/store',()=>store);
import {getPublicCatalog} from '@/lib/catalog';
import {AuthError} from '@/lib/auth-errors';
import {apiError,dbError} from '@/lib/api';
beforeEach(()=>{
 vi.resetAllMocks();store.getEvents.mockResolvedValue([]);store.getVenues.mockResolvedValue([]);
});
it.each(['PGRST200','PGRST202','PGRST205','42P01','42703','42883'])('identifies incomplete schema errors (%s) without exposing backend details',code=>{
 let thrown:unknown;
 try {dbError({code,message:'private database details'});}catch(error){thrown=error;}
 expect(thrown).toMatchObject({status:503,code:'DATABASE_SETUP_REQUIRED'});
 expect((thrown as Error).message).not.toContain('private database details');
 expect(apiError(thrown).status).toBe(503);
});
it('provides a setup state for public browsing while the schema is missing',async()=>{
 store.getEvents.mockRejectedValue(new AuthError(503,'Missing schema','DATABASE_SETUP_REQUIRED'));
 const logging=vi.spyOn(console,'error').mockImplementation(()=>{});
 expect(await getPublicCatalog()).toEqual({events:[],venues:[],issue:'setup'});
 logging.mockRestore();
});
it('shows outages as unavailable, not as a legitimately empty catalog',async()=>{
 store.getEvents.mockRejectedValue(new AuthError(503,'Connection failed','DATABASE_UNAVAILABLE'));
 const logging=vi.spyOn(console,'error').mockImplementation(()=>{});
 expect((await getPublicCatalog()).issue).toBe('unavailable');logging.mockRestore();
});
it('bounds public catalog latency when the data service stalls',async()=>{
 vi.useFakeTimers();
 store.getEvents.mockReturnValue(new Promise(()=>{}));
 store.getVenues.mockReturnValue(new Promise(()=>{}));
 const logging=vi.spyOn(console,'error').mockImplementation(()=>{});
 const result=getPublicCatalog();
 await vi.advanceTimersByTimeAsync(800);
 await expect(result).resolves.toEqual({events:[],venues:[],issue:'unavailable'});
 logging.mockRestore();vi.useRealTimers();
});
it('does not suppress authorization denials or programming errors',async()=>{
 for(const error of [new AuthError(403,'Denied'),new Error('Unexpected failure')]){
  store.getEvents.mockRejectedValue(error);await expect(getPublicCatalog()).rejects.toBe(error);
 }
});
it('keeps valid empty and populated catalogs distinguishable from failures',async()=>{
 expect(await getPublicCatalog()).toEqual({events:[],venues:[],issue:null});
 store.getEvents.mockResolvedValue([{id:'event-a'}]);store.getVenues.mockResolvedValue([{id:'venue-a'}]);
 expect(await getPublicCatalog()).toEqual({events:[{id:'event-a'}],venues:[{id:'venue-a'}],issue:null});
});
