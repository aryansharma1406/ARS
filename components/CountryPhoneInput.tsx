'use client';

import {useEffect,useRef,useState} from 'react';
import {getCountries,getCountryCallingCode,parsePhoneNumberFromString,type CountryCode} from 'libphonenumber-js/max';

const names=new Intl.DisplayNames(['en'],{type:'region'});
const countries=getCountries().map(code=>({code,name:names.of(code)||code,dial:getCountryCallingCode(code)})).sort((a,b)=>a.name.localeCompare(b.name));

export function validCountryPhone(value:string,country:CountryCode){
  const phone=parsePhoneNumberFromString(value,{defaultCountry:country,extract:false});
  return phone?.isValid()&&phone.country===country&&!phone.ext?phone.number:null;
}

export default function CountryPhoneInput({value,country,onChange,onCountryChange}:{value:string;country:CountryCode;onChange:(value:string)=>void;onCountryChange:(country:CountryCode)=>void}){
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState('');
  const [touched,setTouched]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  const input=useRef<HTMLInputElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const name=names.of(country)||country;
  const error=value&&!validCountryPhone(value,country)?`Enter a valid mobile number for ${name}.`:'';
  useEffect(()=>{input.current?.setCustomValidity(error);},[error]);
  useEffect(()=>{
    if(!open)return;
    const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
    document.addEventListener('pointerdown',close);
    return()=>document.removeEventListener('pointerdown',close);
  },[open]);
  const query=search.trim().toLowerCase();
  const filtered=countries.filter(item=>`${item.name} ${item.code} +${item.dial}`.toLowerCase().includes(query));
  return <div ref={root} className="relative min-w-0" onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}}}>
    <div className="flex min-w-0 gap-2">
      <button ref={trigger} type="button" aria-label={`Country: ${name}, +${getCountryCallingCode(country)}`} aria-expanded={open} aria-controls="checkout-country-picker" onClick={()=>{setOpen(!open);setSearch('');}} className="ars-button ars-button-secondary shrink-0 !px-3 !py-2 !text-xs !tracking-normal">{country} +{getCountryCallingCode(country)}</button>
      <input ref={input} id="checkout-phone" type="tel" required autoComplete="tel-national" inputMode="tel" maxLength={country==='IN'?10:undefined} aria-label="Mobile number" placeholder="Mobile number" value={value} onChange={event=>onChange(country==='IN'?event.target.value.replace(/\D/g,'').slice(0,10):event.target.value)} onBlur={()=>setTouched(true)} aria-invalid={touched&&Boolean(error)} aria-describedby={touched&&error?'checkout-phone-error':undefined} className="ars-input min-w-0 flex-1"/>
    </div>
    {open&&<div id="checkout-country-picker" role="region" aria-label="Select country" className="absolute inset-x-0 top-full z-30 mt-2 border border-[#cbb88a]/30 bg-[#11110f] p-3 shadow-xl">
      <input autoFocus type="search" aria-label="Search countries or calling codes" placeholder="Search country or code" value={search} onChange={event=>setSearch(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')event.preventDefault();}} className="ars-input !text-sm"/>
      <div className="mt-2 max-h-56 overflow-y-auto">
        {filtered.map(item=><button key={item.code} type="button" aria-pressed={country===item.code} onClick={()=>{onCountryChange(item.code);setOpen(false);input.current?.focus();}} className={`flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-white/10 focus-visible:outline focus-visible:outline-[#cbb88a] ${country===item.code?'bg-white/5 text-[#cbb88a]':'text-zinc-300'}`}><span>{item.name}</span><span>+{item.dial}</span></button>)}
        {!filtered.length&&<p role="status" className="p-3 text-sm text-zinc-400">No matching countries.</p>}
      </div>
    </div>}
    {touched&&error&&<p id="checkout-phone-error" role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
  </div>;
}
