'use client';
import {useEffect,useRef} from 'react';

type ConsultedEvent={
 id:string;title:string;event_date:string|null;status:string;expected_attendees:number|null;
 start_time?:string|null;end_time?:string|null;venue?:string|null;notes?:string|null;archived_at?:string|null;
};
type AttendanceSummary={id:string;actual_students:number};
const statusNames:Record<string,string>={
 lead:'Oportunidade',quoted:'Proposta',reserved:'Reservado',confirmed:'Confirmado',
 completed:'Concluído',cancelled:'Cancelado',canceled:'Cancelado'
};
const dateLabel=(value:string|null)=>{
 if(!value)return 'Não informada';
 const parsed=new Date(value);
 return Number.isNaN(parsed.getTime())?'Não informada':
 new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(parsed);
};
const timeLabel=(value:string|null|undefined)=>value?String(value).slice(0,5):'';
const informationCard:React.CSSProperties={background:'#e8f2ff',border:'1px solid #d0e1f8',borderRadius:10,padding:'12px 14px',minWidth:0};

export default function EventReadOnlyDialog({event,attendance,onClose}:{
 event:ConsultedEvent|null;attendance:AttendanceSummary[];onClose:()=>void;
}){
 const closeRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  if(!event)return;
  const previouslyFocused=document.activeElement instanceof HTMLElement?document.activeElement:null;
  closeRef.current?.focus();
  const onKeyDown=(keyEvent:KeyboardEvent)=>{if(keyEvent.key==='Escape'){keyEvent.preventDefault();onClose();}};
  document.addEventListener('keydown',onKeyDown);
  return()=>{document.removeEventListener('keydown',onKeyDown);previouslyFocused?.focus();};
 },[event,onClose]);
 if(!event)return null;
 const actual=attendance.find(row=>row.id===event.id)?.actual_students;
 const predicted=event.expected_attendees;
 const start=timeLabel(event.start_time);
 const end=timeLabel(event.end_time);
 const hours=start?start+(end?' às '+end:''):'Não informado';
 const difference=actual!=null&&predicted!=null?actual-predicted:null;
 return <div role="presentation" style={{position:'fixed',inset:0,zIndex:1350,background:'rgba(6,24,55,.66)',display:'grid',placeItems:'center',padding:16}}>
  <section role="dialog" aria-modal="true" aria-labelledby="event-read-title"
   style={{width:'min(100%,590px)',maxHeight:'90dvh',overflowY:'auto',background:'#f5f9ff',border:'1px solid #8dbbeb',borderRadius:16,boxShadow:'0 24px 65px rgba(6,22,56,.35)',color:'#163b73'}}>
   <header style={{background:'linear-gradient(110deg,#123977,#267fda)',color:'#fff',padding:'17px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
    <div><div style={{fontSize:10,fontWeight:800,letterSpacing:1.1,color:'#c7e4ff'}}>ANTARES · CLIENTES</div><h2 id="event-read-title" style={{fontSize:19,margin:'4px 0 0',color:'#fff'}}>Detalhes do evento</h2></div>
    <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar detalhes do evento"
     style={{border:0,borderRadius:8,background:'#e5f1ff',color:'#1b5596',padding:'7px 11px',fontSize:18,cursor:'pointer'}}>×</button>
   </header>
   <div style={{padding:'18px 20px',display:'grid',gap:14}}>
    <div><strong style={{fontSize:18,overflowWrap:'anywhere'}}>{event.title}</strong>
     <div style={{fontSize:13,color:'#45658e',marginTop:5}}>{statusNames[event.status]||event.status||'Não informado'}{event.archived_at?' · Arquivado':''}</div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:9}}>
     {([
      ['Data',dateLabel(event.event_date)],
      ['Horário',hours],
      ['Alunos previstos',predicted==null?'Não informado':predicted.toLocaleString('pt-BR')],
      ['Alunos atendidos',actual==null?'Ainda não registrados':actual.toLocaleString('pt-BR')]
     ] as const).map(([label,value])=><div key={label} style={informationCard}><div style={{fontSize:12,color:'#55749b',marginBottom:4}}>{label}</div><strong style={{fontSize:15}}>{value}</strong></div>)}
    </div>
    {difference!==null&&<div style={{border:'1px solid #b4dcc8',background:'#ebf8f1',borderRadius:10,padding:12,fontSize:13,color:'#176145'}}>
     <strong>Comparação do público:</strong> {difference===0?'quantidade atendida igual à previsão.':difference>0?difference.toLocaleString('pt-BR')+' alunos acima da previsão.':Math.abs(difference).toLocaleString('pt-BR')+' alunos abaixo da previsão.'}
    </div>}
    {event.venue?.trim()&&<div style={{fontSize:13}}><strong>Local:</strong> {event.venue}</div>}
    {event.notes?.trim()&&<div style={{fontSize:13,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}><strong>Observações:</strong> {event.notes}</div>}
    <button type="button" onClick={onClose} style={{width:'100%',border:'1px solid #b8d2f6',borderRadius:9,background:'#e5effe',color:'#174987',padding:'11px 16px',fontWeight:750,cursor:'pointer'}}>Fechar</button>
   </div>
  </section>
 </div>;
}
