'use client';
import {useEffect,useState} from 'react';
type InstallPrompt=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
export default function InstallAntares(){
 const [prompt,setPrompt]=useState<InstallPrompt|null>(null);
 const [installed,setInstalled]=useState(false);
 const [mobile,setMobile]=useState(false);
 useEffect(()=>{
  const media=window.matchMedia('(display-mode: standalone)');
  const mobileMedia=window.matchMedia('(max-width: 767px) and (pointer: coarse)');
  const sync=()=>setInstalled(media.matches||('standalone' in navigator&&Boolean((navigator as Navigator & {standalone?:boolean}).standalone)));
  const syncMobile=()=>setMobile(mobileMedia.matches);
  sync();syncMobile();
  const onPrompt=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt)};
  const onInstalled=()=>{setInstalled(true);setPrompt(null)};
  window.addEventListener('beforeinstallprompt',onPrompt);
  window.addEventListener('appinstalled',onInstalled);
  media.addEventListener('change',sync);
  mobileMedia.addEventListener('change',syncMobile);
  return()=>{window.removeEventListener('beforeinstallprompt',onPrompt);window.removeEventListener('appinstalled',onInstalled);media.removeEventListener('change',sync);mobileMedia.removeEventListener('change',syncMobile)};
 },[]);
 async function install(){if(!prompt)return;const deferred=prompt;setPrompt(null);try{await deferred.prompt();await deferred.userChoice;}catch{/* Chrome pode cancelar */}}
 if(!prompt||installed||!mobile)return null;
 return <button type="button" onClick={install} title="Instalar o ANTARES como aplicativo" style={{display:'inline-flex',alignItems:'center',gap:8,padding:'10px 15px',background:'#164eb4',color:'#fff',fontWeight:700,border:0,borderRadius:10,cursor:'pointer',boxShadow:'0 3px 10px #164eb433'}}>
 <span aria-hidden="true">↓</span> Instalar ANTARES
 </button>;
}
