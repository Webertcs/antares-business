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
 const markRead=useCallback(async(keys:string[])=>{
  if(keys.length===0)return;
  const res=await fetch('/api/notificacoes',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({action:'read',keys})
  });
  const data=await res.json();
  if(!res.ok||!data.ok)throw Error(data.error||'Não foi possível registrar a leitura.');
  const marked=new Set(keys);
  setFeed(current=>{
   if(!current)return current;
   const items=current.items.map(item=>marked.has(item.readKey)?{...item,read:true}:item);
   return {...current,items,unreadCount:items.filter(item=>!item.read).length};
  });
  window.dispatchEvent(new Event('antares:notifications-read'));
 },[]);
 useEffect(()=>{
  if(!enabled){setLoading(false);return;}
  const controller=new AbortController();
  const update=()=>{if(!controller.signal.aborted)void refresh(controller.signal);};
  update();
  const onVisible=()=>{if(document.visibilityState==='visible')update();};
  window.addEventListener('focus',update);
  window.addEventListener('antares:opportunities-updated',update);
  window.addEventListener('antares:notifications-read',update);
  document.addEventListener('visibilitychange',onVisible);
  const timer=window.setInterval(onVisible,60000);
  return()=>{
   controller.abort();
   window.removeEventListener('focus',update);
   window.removeEventListener('antares:opportunities-updated',update);
   window.removeEventListener('antares:notifications-read',update);
   document.removeEventListener('visibilitychange',onVisible);
   window.clearInterval(timer);
  };
 },[enabled,refresh]);
 return {feed,error,loading,refresh:()=>refresh(),markRead};
}
