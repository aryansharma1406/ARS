import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {requireAdmin} from '@/lib/auth';
import {apiError,checkOrigin} from '@/lib/api';
import {supabaseConfig} from '@/lib/supabase';
export const runtime='nodejs';
export async function POST(request:Request){
  try{
    checkOrigin(request);await requireAdmin();
    if(request.headers.get('content-type')!=='image/jpeg')return NextResponse.json({error:'Upload a JPEG photo using the photo picker.'},{status:400});
    const limit=5*1024*1024;
    if(Number(request.headers.get('content-length'))>limit)return NextResponse.json({error:'Photo must be under 5 MB.'},{status:413});
    const reader=request.body?.getReader();if(!reader)return NextResponse.json({error:'Choose a photo.'},{status:400});
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();return NextResponse.json({error:'Photo must be under 5 MB.'},{status:413});}chunks.push(value);}
    const bytes=Buffer.concat(chunks);
    if(bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)return NextResponse.json({error:'Invalid photo file.'},{status:400});
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!key)return NextResponse.json({error:'Photo storage is not configured. Add the server Supabase service role key.'},{status:503});
    const {url}=supabaseConfig();
    // Privileged storage access is limited to this authenticated admin upload; no database writes.
    const storage=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}).storage;
    const bucket='ars-venue-photos';
    const existing=await storage.getBucket(bucket);
    if(existing.error){
      const created=await storage.createBucket(bucket,{public:true,fileSizeLimit:limit,allowedMimeTypes:['image/jpeg']});
      if(created.error&&!/already exists|duplicate/i.test(created.error.message))return NextResponse.json({error:'Unable to prepare photo storage. Check Supabase Storage configuration.'},{status:503});
    }else if(!existing.data.public){return NextResponse.json({error:'The venue photo bucket must allow public photo viewing.'},{status:503});}
    const path=`venues/${randomUUID()}.jpg`;
    const uploaded=await storage.from(bucket).upload(path,bytes,{contentType:'image/jpeg',cacheControl:'31536000',upsert:false});
    if(uploaded.error)return NextResponse.json({error:'Photo upload failed. Please try again.'},{status:503});
    return NextResponse.json({url:storage.from(bucket).getPublicUrl(path).data.publicUrl},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return apiError(error);}
}
