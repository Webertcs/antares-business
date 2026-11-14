'use client';
import {useEffect,useRef,useState,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import Link from 'next/link';
import {Bell,BriefcaseBusiness,CalendarDays,ChevronRight,HeartHandshake,Wallet,X} from 'lucide-react';
import type {AntaresNotification,NotificationFeed} from '@/lib/notificacoes/types';

type Props={
 open:boolean;
 anchorRef:RefObject<HTMLButtonElement|null>;
 onClose:()=>void;
 feed:NotificationFeed|null;
 error:string;
 loading:boolean;
 onRead:(keys:string[])=>Promise<void>;
};
type Placement={left:number;width:number;bottom:number|null;maxHeight:number};
const categoryName={opportunities:'Oportunidades',loyalty:'Fidelização',agenda:'Agenda interna',finance:'Financeiro'};
const iconFor=(category:AntaresNotification['category'])=>{
 switch(category){
  case 'opportunities':return <BriefcaseBusiness size={16}/>;
  case 'loyalty':return <HeartHandshake size={16}/>;
  case 'agenda':return <CalendarDays size={16}/>;
  case 'finance':return <Wallet size={16}/>;
 }
};
export default function NotificationPopover({open,anchorRef,onClose,feed,error,loading,onRead}:Props){
 const panelRef=useRef<HTMLDivElement>(null);
 const [placement,setPlacement]=useState<Placement|null>(null);
 const [readError,setReadError]=useState('');
 const attempted=useRef(new Set<string>());
 // Abrir o sino marca como lidos somente os avisos realmente exibidos (até cinco).
 useEffect(()=>{
  if(!open){attempted.current.clear();setReadError('');return;}
  if(!feed?.readPersistenceAvailable)return;
  const visible=feed.items.slice(0,5).filter(n=>!n.read&&!attempted.current.has(n.readKey)).map(n=>n.readKey);
  if(visible.length===0)return;
  visible.forEach(key=>attempted.current.add(key));
  void onRead(visible).then(()=>setReadError('')).catch(()=>setReadError('Não foi possível registrar a leitura. O aviso continuará não lido.'));
 },[open,feed,onRead]);
 useEffect(()=>{
  if(!open)return;
  const updatePosition=()=>{
   const bell=anchorRef.current;if(!bell)return;
   const viewportWidth=window.innerWidth,viewportHeight=window.innerHeight;
   const width=Math.min(370,Math.max(0,viewportWidth-24));
   const sidebar=bell.closest('aside')?.getBoundingClientRect();
   const beside=Boolean(sidebar&&sidebar.right+width+24<=viewportWidth);
   const bellRect=bell.getBoundingClientRect();
   const bottom=beside?Math.max(12,Math.min(viewportHeight-92,viewportHeight-bellRect.bottom)):null;
   setPlacement({
    left:beside&&sidebar?sidebar.right+12:Math.max(12,(viewportWidth-width)/2),
    width,bottom,
    maxHeight:Math.max(80,Math.min(480,viewportHeight-(bottom??12)-12))
   });
  };
  const onPointerDown=(event:PointerEvent)=>{
   const target=event.target as Node;
   if(panelRef.current?.contains(target)||anchorRef.current?.contains(target))return;
   onClose();
  };
  const onKeyDown=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){onClose();anchorRef.current?.focus();}
  };
  updatePosition();
  window.addEventListener('resize',updatePosition);
  document.addEventListener('scroll',updatePosition,true);
  document.addEventListener('pointerdown',onPointerDown);
  document.addEventListener('keydown',onKeyDown);
  return()=>{
   window.removeEventListener('resize',updatePosition);
   document.removeEventListener('scroll',updatePosition,true);
   document.removeEventListener('pointerdown',onPointerDown);
   document.removeEventListener('keydown',onKeyDown);
  };
 },[open,anchorRef,onClose]);
 if(!open||!placement)return null;
 const count=feed?.count??0;
 const unread=feed?.unreadCount??0;
 return createPortal(
  <section ref={panelRef} id="antares-notification-panel" role="region" aria-labelledby="antares-notification-heading"
   style={{position:'fixed',zIndex:1100,left:placement.left,width:placement.width,
    ...(placement.bottom===null?{top:'50%',transform:'translateY(-50%)'}:{bottom:placement.bottom}),
    maxHeight:placement.maxHeight,overflowY:'auto',overflowX:'hidden',background:'#fff',
    border:'1px solid #b9d2f4',borderRadius:14,boxShadow:'0 14px 38px rgba(16,48,98,.22)',
    padding:14,color:'#153f78'}}>
   <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:10}}>
    <span style={{display:'flex',alignItems:'center',gap:8}}>
     <Bell size={18} color="#1d60bc"/>
     <strong id="antares-notification-heading" style={{fontSize:15}}>Notificações</strong>
     {count>0&&<span style={{borderRadius:20,padding:'2px 7px',background:'#e9f1ff',fontSize:11,fontWeight:800}}>{count>99?'99+':count} pendente{count===1?'':'s'}</span>}
     {unread>0&&<span style={{borderRadius:20,padding:'2px 7px',background:'#ffe4e1',color:'#b12e29',fontSize:11,fontWeight:800}}>{unread>99?'99+':unread} nova{unread===1?'':'s'}</span>}
    </span>
    <button type="button" onClick={onClose} aria-label="Fechar notificações" style={{background:'#e8f1ff',border:'1px solid #c6dcfa',borderRadius:8,padding:5,color:'#174780'}}><X size={16}/></button>
   </header>
   {loading&&!feed&&<p role="status" style={{fontSize:13}}>Consultando avisos...</p>}
   {(error||readError)&&<p role="status" style={{fontSize:12,color:'#a3392c',background:'#fff0ed',padding:10,borderRadius:8}}>{error||readError}</p>}
   {feed&&<>
    {!feed.readPersistenceAvailable&&<p role="status" style={{fontSize:12,color:'#985911',background:'#fff7e6',padding:9,borderRadius:8}}>Os avisos lidos podem voltar a aparecer depois de atualizar a página. Eles continuam disponíveis para consulta.</p>}
    {feed.unavailable.length>0&&<p role="status" style={{fontSize:12,color:'#985911'}}>Alguns módulos estão indisponíveis no momento.</p>}
    {feed.items.length===0&&<p style={{fontSize:13,padding:'9px 2px'}}>Nenhuma pendência registrada nos módulos disponíveis.</p>}
    {feed.items.slice(0,5).map(n=>
     <Link key={n.id} href={n.href} onClick={onClose}
      style={{display:'block',padding:'10px',marginBottom:7,borderRadius:10,
       background:n.priority==='high'?'#eef5ff':'#f7faff',border:'1px solid #d9e7fa',color:'#143968'}}>
      <span style={{display:'flex',alignItems:'center',gap:7,fontSize:11,color:'#4773ab',fontWeight:700}}>{iconFor(n.category)}{categoryName[n.category]}</span>
      <strong style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13,marginTop:5}}>{n.title}{!n.read&&<small style={{fontSize:10,color:'#bd3c30'}}>Novo</small>}</strong>
      <span style={{display:'block',fontSize:12,marginTop:3,overflowWrap:'anywhere'}}>{n.detail}</span>
     </Link>
    )}
    {feed.items.length>5&&<p style={{fontSize:12,color:'#536e97',textAlign:'center'}}>Mais {feed.items.length-5} pendências na Central</p>}
   </>}
   <Link href="/notificacoes" onClick={onClose}
    style={{marginTop:10,padding:'11px 12px',display:'flex',justifyContent:'space-between',
     alignItems:'center',borderRadius:10,background:'#2366c4',color:'white',fontWeight:750,fontSize:13}}>
    Ver todas as notificações <ChevronRight size={17}/>
   </Link>
  </section>,document.body);
}
