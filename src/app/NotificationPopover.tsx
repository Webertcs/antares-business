'use client';

import {useEffect,useRef,useState,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import Link from 'next/link';
import {X} from 'lucide-react';

type RelationshipAlert = {client_id:string;client_name:string;days:number;severity:string};
type LateReminder = {id:string;client_name:string;due_date:string|null};

type Props = {
 open:boolean;
 anchorRef:RefObject<HTMLButtonElement|null>;
 onClose:()=>void;
 alertsAvailable:boolean;
 remindersAvailable:boolean;
 relationshipAlerts:RelationshipAlert[];
 lateReminders:LateReminder[];
};
type Placement={left:number;width:number;bottom:number|null;maxHeight:number};

export default function NotificationPopover({
 open,anchorRef,onClose,alertsAvailable,remindersAvailable,relationshipAlerts,lateReminders
}:Props){
 const panelRef=useRef<HTMLDivElement>(null);
 const [placement,setPlacement]=useState<Placement|null>(null);

 useEffect(()=>{
  if(!open)return;
  const updatePosition=()=>{
   const bell=anchorRef.current;
   if(!bell)return;
   const viewportWidth=window.innerWidth;
   const viewportHeight=window.innerHeight;
   const width=Math.min(370,Math.max(0,viewportWidth-24));
   const sidebar=bell.closest('aside')?.getBoundingClientRect();
   const beside=Boolean(sidebar&&sidebar.right+12+width+12<=viewportWidth);
   const bellRect=bell.getBoundingClientRect();
   // Ancorar ao lado do menu sem ficar dentro da área rolável da sidebar.
   const bottom=beside
    ?Math.max(12,Math.min(viewportHeight-92,viewportHeight-bellRect.bottom))
    :null;
   setPlacement({
    left:beside&&sidebar?sidebar.right+12:Math.max(12,(viewportWidth-width)/2),
    width,
    bottom,
    maxHeight:Math.max(80,Math.min(440,viewportHeight-(bottom??12)-12))
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

 return createPortal(
  <div
   ref={panelRef}
   id="antares-notification-panel"
   role="region"
   aria-labelledby="antares-notification-heading"
   style={{
    position:'fixed',
    zIndex:1100,
    left:placement.left,
    width:placement.width,
    ...(placement.bottom===null
     ?{top:'50%',transform:'translateY(-50%)'}
     :{bottom:placement.bottom}),
    maxHeight:placement.maxHeight,
    overflowY:'auto',
    overflowX:'hidden',
    background:'#fff',
    border:'1px solid #b9d2f4',
    borderRadius:14,
    boxShadow:'0 14px 38px rgba(16,48,98,.22)',
    padding:14,
    color:'#153f78'
   }}
  >
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:12}}>
    <strong id="antares-notification-heading">Notificações</strong>
    <button type="button" onClick={onClose} aria-label="Fechar notificações" style={{background:'#e8f1ff',border:'1px solid #c6dcfa',borderRadius:8,padding:5,color:'#174780'}}>
     <X size={16}/>
    </button>
   </div>
   {!alertsAvailable&&!remindersAvailable
    ?<p style={{fontSize:13}}>Não foi possível consultar as notificações no momento.</p>
    :<>
     {relationshipAlerts.length===0&&lateReminders.length===0&&
      <p style={{fontSize:13}}>Nenhum alerta pendente no momento.</p>}
     {relationshipAlerts.map(a=>
      <Link key={a.client_id} href="/fidelizacao" onClick={onClose} style={{display:'block',padding:'10px 8px',marginBottom:6,borderRadius:8,background:a.severity==='critical'?'#fff1ed':'#fff8e7',color:'#173e72',textDecoration:'none',fontSize:13}}>
       <strong>{a.severity==='critical'?'Alerta prioritário':'Acompanhamento recomendado'}</strong>
       <div>{a.client_name}</div>
       <small>{a.days} dias desde a última visita · Abrir Central de Alertas</small>
      </Link>)}
     {lateReminders.map(a=>
      <Link key={a.id} href="/fidelizacao" onClick={onClose} style={{display:'block',padding:'10px 8px',marginBottom:6,borderRadius:8,background:'#eaf2ff',color:'#173e72',textDecoration:'none',fontSize:13}}>
       <strong>Lembrete vencido</strong>
       <div>{a.client_name}</div>
       <small>{a.due_date?String(a.due_date).slice(0,10).split('-').reverse().join('/'):'Sem prazo'} · Abrir Agenda Interna</small>
      </Link>)}
    </>}
  </div>,
  document.body
 );
}
