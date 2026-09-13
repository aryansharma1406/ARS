'use client';
import {useState} from 'react';
export default function VenuePhotoUpload({value,onChange,onBusyChange}:{value:string;onChange:(url:string)=>void;onBusyChange:(busy:boolean)=>void}){
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function upload(file:File){
    setError('');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Choose a JPG, PNG or WebP photo.');return;}
    if(file.size>15*1024*1024){setError('Choose a photo smaller than 15 MB.');return;}
    setBusy(true);onBusyChange(true);
    try{
      const bitmap=await createImageBitmap(file);
      let blob:Blob;
      try{
        if(bitmap.width*bitmap.height>50000000)throw new Error('Photo resolution is too large. Choose a smaller image.');
        const scale=Math.min(1,2000/Math.max(bitmap.width,bitmap.height));
        const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
        const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Your browser cannot prepare this photo.');
        ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
        blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(new Error('Unable to prepare photo.')),'image/jpeg',0.88));
      }finally{bitmap.close();}
      const response=await fetch('/api/admin/venue-photo',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:blob});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Upload failed.');onChange(result.url);
    }catch(e){setError(e instanceof Error?e.message:'Unable to upload photo.');}finally{setBusy(false);onBusyChange(false);}
  }
  return <div className="space-y-3"><span className="ars-label">Venue photo</span>{value&&<img src={value} alt="Venue photo preview" className="aspect-square w-full rounded-lg border border-[#cbb88a]/25 object-cover"/>}<button type="button" disabled={busy||!value} onClick={()=>{onChange('');setError('');}} className="text-xs text-zinc-400 underline underline-offset-4 hover:text-white disabled:hidden">Remove photo</button><label className="block cursor-pointer rounded-lg border border-dashed border-[#cbb88a]/40 bg-[#cbb88a]/5 p-4"><span className="mb-2 block text-sm font-semibold text-[#e2d4ae]">{busy?'Uploading photo...':value?'Replace photo':'Upload photo'}</span><input aria-label="Upload venue photo" disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded file:border-0 file:bg-[#e2d4ae] file:px-3 file:py-2 file:text-black" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file);}}/></label><p className="text-[11px] text-zinc-500">JPG, PNG or WebP, up to 15 MB. Photos are optimized for web display. Save the venue to apply or remove the photo. Leaving it empty shows the default placeholder.</p>{error&&<p role="alert" className="text-xs text-red-300">{error}</p>}</div>;
}
