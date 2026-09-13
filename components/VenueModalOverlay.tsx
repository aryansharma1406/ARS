'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

export default function VenueModalOverlay({children,onClose}:{children:ReactNode;onClose:()=>void}) {
  const [mounted,setMounted]=useState(false);
  useEffect(()=>{
    setMounted(true);
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=previous;};
  },[]);
  if(!mounted)return null;
  return createPortal(<div onClick={event=>{if(event.target===event.currentTarget)onClose();}} className="operations fixed inset-0 z-[200] !m-0 flex items-center justify-center overscroll-contain bg-black/90 p-4 backdrop-blur-md">{children}</div>,document.body);
}
