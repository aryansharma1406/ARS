'use client';
import {useState} from 'react';

export default function GroupGuestSelection({purchased,entered,disabled,onChange}:{purchased:number;entered:number;disabled:boolean;onChange:(quantity:number)=>void}){
 const [selected,setSelected]=useState<number[]>(entered<purchased?[entered]:[]);
 return <fieldset disabled={disabled} className="space-y-3">
  <legend className="text-sm text-[#e2d4ae]">Select guests entering now</legend>
  <p className="text-xs text-zinc-400">Guest slots represent admission counts, not named individuals. Previously entered slots are locked.</p>
  <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
   {Array.from({length:purchased},(_,index)=>{
    const used=index<entered;
    return <label key={index} className={`flex min-h-12 items-center gap-2 border p-3 text-sm ${used?'border-white/10 text-zinc-500':'border-[#cbb88a]/40 text-[#e2d4ae]'}`}>
     <input type="checkbox" disabled={disabled||used} checked={used||selected.includes(index)} onChange={()=>{
      const next=selected.includes(index)?selected.filter(value=>value!==index):[...selected,index];setSelected(next);onChange(next.length);
     }}/><span>Guest {index+1}{used?' · Entered':''}</span>
    </label>;
   })}
  </div>
 </fieldset>;
}
