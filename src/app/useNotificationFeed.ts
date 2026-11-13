'use client';
import {useCallback,useEffect,useState} from 'react';
import type {NotificationFeed} from '@/lib/notificacoes/types';

export function useNotificationFeed(enabled:boolean){
 const [feed,setFeed]=useState<NotificationFeed|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(enabled);
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  try{
   const res=await fetch('/api/notificacoes',{cache:'no-store',signal});
   const data=await res.json();
   if(!res.ok)throw Error(data.error||'Não foi possível consultar os avisos.');
   if(!signal?.aborted){setFeed(data as NotificationFeed);setError('');}
  }catch(e){
   if(!signal?.aborted)setError(e instanceof Error?e.message:'Notificações indisponíveis.');
  }finally{if(!signal?.aborted)setLoading(false);}
 },[]);
 useEffect(()=>{
  if(!enabled){setLoading(false);return;}
  const controller=new AbortController();
  const update=()=>{if(!controller.signal.aborted)void refresh(controller.signal);};
  update();
  const onVisible=()=>{if(document.visibilityState==='visible')update();};
  window.addEventListener('focus',update);
  window.addEventListener('antares:opportunities-updated',update);
  document.addEventListener('visibilitychange',onVisible);
  const timer=window.setInterval(onVisible,60000);
  return()=>{
   controller.abort();
   window.removeEventListener('focus',update);
   window.removeEventListener('antares:opportunities-updated',update);
   document.removeEventListener('visibilitychange',onVisible);
   window.clearInterval(timer);
  };
 },[enabled,refresh]);
 return {feed,error,loading,refresh:()=>refresh()};
}
