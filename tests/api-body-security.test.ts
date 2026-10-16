import {expect,it,vi} from 'vitest';
import {jsonBody} from '../lib/api';

const request=(body:string)=>new Request('https://ars.invalid/api',{method:'POST',headers:{'content-type':'application/json'},body});
it('accepts bounded JSON objects and rejects non-object payloads',async()=>{
 expect(await jsonBody(request('{"name":"Guest"}'))).toEqual({name:'Guest'});
 for(const body of ['[]','null','invalid'])await expect(jsonBody(request(body))).rejects.toMatchObject({status:400});
});
it('rejects oversized declared lengths before reading the body',async()=>{
 const req=request('{}');req.headers.set('content-length','16001');
 await expect(jsonBody(req)).rejects.toMatchObject({status:400});expect(req.bodyUsed).toBe(false);
});
it('cancels oversized streamed bodies even without a content-length header',async()=>{
 const cancel=vi.fn();
 const stream=new ReadableStream<Uint8Array>({pull(controller){controller.enqueue(new Uint8Array(8001));},cancel});
 const req=new Request('https://ars.invalid/api',{method:'POST',headers:{'content-type':'application/json'},body:stream,duplex:'half'} as RequestInit);
 await expect(jsonBody(req)).rejects.toMatchObject({status:400});expect(cancel).toHaveBeenCalledOnce();
});
it('measures UTF-8 bytes rather than characters',async()=>{
 await expect(jsonBody(request(JSON.stringify({name:'\u20ac'.repeat(6000)})))).rejects.toMatchObject({status:400});
});
