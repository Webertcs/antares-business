'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ChevronLeft} from 'lucide-react';
export default function BackButton({pwaOnly=false,onBack}:{pwaOnly?:boolean;onBack?:()=>void}){
 const router=useRouter();
 const [isInstalledPwa,setIsInstalledPwa]=useState(false);
 useEffect(()=>{
  if(!pwaOnly)return;
  const media=window.matchMedia('(display-mode: standalone)');
  const update=()=>setIsInstalledPwa(media.matches||Boolean((window.navigator as Navigator & {standalone?:boolean}).standalone));
  update();
  media.addEventListener('change',update);
  return ()=>media.removeEventListener('change',update);
 },[pwaOnly]);
 if(pwaOnly&&!isInstalledPwa)return null;
 return <button type="button" className="owner-back-button" aria-label="Voltar para a página anterior" onClick={()=>{if(onBack){onBack();return;}if(window.history.length>1)router.back();else router.replace('/');}}><ChevronLeft size={15}/> Voltar</button>;
}
