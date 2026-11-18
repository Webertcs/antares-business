'use client';

import {useEffect,useRef,useState} from 'react';
import {CheckCircle2,X} from 'lucide-react';
import type {ServiceReservation} from './ServiceBooking';

type ClosingState={
 status:string;
 attendance:{actual_students:number;closed_at:string}|null;
 canClose:boolean;
 blockedReason?:string;
};

const dateTime=(value:string)=>new Intl.DateTimeFormat('pt-BR',{
 dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'
}).format(new Date(value));
const primary:React.CSSProperties={border:0,background:'#175fbb',color:'#fff',borderRadius:9,padding:'11px 17px',fontWeight:750,cursor:'pointer'};
const secondary:React.CSSProperties={border:'1px solid #abc7eb',background:'#fff',color:'#174e92',borderRadius:9,padding:'10px 14px',fontWeight:700,cursor:'pointer'};

export default function ServiceClosing({reservation,institution,onClose,onSaved}:{
 reservation:ServiceReservation;institution:string;onClose:()=>void;onSaved:()=>void;
}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [state,setState]=useState<ClosingState|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [students,setStudents]=useState('');
 const [message,setMessage]=useState('');
 const eventId=reservation.crm_event_id;
 const recorded=!!state?.attendance;
 const completed=recorded||state?.status==='completed'||reservation.crm_event_status==='completed';
 const valid=/^\d+$/.test(students)&&Number.isSafeInteger(Number(students))&&Number(students)<=100000;

 useEffect(()=>{
  const el=dialog.current;
  if(el&&!el.open)el.showModal();
  const controller=new AbortController();
  void (async()=>{
   if(!eventId){setLoading(false);return;}
   try{
    const response=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/encerramento',{cache:'no-store',signal:controller.signal});
    const result=await response.json();
    if(!response.ok)throw Error(result.error||'Não foi possível consultar a conclusão.');
    if(!controller.signal.aborted)setState(result as ClosingState);
   }catch(cause){
    if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:'Consulta indisponível.');
   }finally{if(!controller.signal.aborted)setLoading(false);}
  })();
  return()=>{controller.abort();if(el?.open)el.close();};
 },[eventId]);

 async function conclude(){
  if(busy||!eventId||!state?.canClose||!valid)return;
  setBusy(true);setError('');setMessage('');
  try{
   const response=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/encerramento',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({students:Number(students)})
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Não foi possível concluir esta apresentação.');
   const verified=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/encerramento',{cache:'no-store'});
   const latest=await verified.json();
   if(!verified.ok||latest.status!=='completed'||!latest.attendance){
    setMessage('A conclusão foi enviada, mas a confirmação ainda não apareceu. Atualize a Central antes de tentar novamente.');
    return;
   }
   setState(latest as ClosingState);
   setStudents('');
   onSaved();
  }catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível salvar a quantidade.');}
  finally{setBusy(false);}
 }
 function dismiss(){if(!busy)onClose();}

 return <dialog ref={dialog} aria-labelledby="central-closing-title"
  onCancel={event=>{event.preventDefault();dismiss();}}
  style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',margin:0,
   width:'min(100% - 24px,500px)',maxHeight:'90dvh',overflowY:'auto',padding:0,
   border:0,borderRadius:16,background:'#f9fbff',color:'#173b73',boxShadow:'0 22px 65px #061b4680'}}>
  <header style={{padding:'17px 20px',background:'linear-gradient(110deg,#10336e,#2376d3)',
   color:'#fff',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
   <h2 id="central-closing-title" style={{margin:0,color:'#fff',fontSize:20}}>Conclusão</h2>
   <button type="button" aria-label="Fechar" disabled={busy} onClick={dismiss}
    style={{...secondary,padding:7,display:'grid',placeItems:'center'}}><X size={18}/></button>
  </header>
  <div style={{padding:20,display:'grid',gap:15}}>
   <div style={{background:'#edf5ff',border:'1px solid #c4d9f5',padding:13,borderRadius:10}}>
    <strong>{institution}</strong>
    <p style={{margin:'5px 0 0',fontSize:13,color:'#43648e'}}>Apresentação: {dateTime(reservation.starts_at)}</p>
   </div>

   {loading&&<p role="status" style={{margin:0}}>Carregando conclusão…</p>}
   {error&&<p role="alert" style={{margin:0,color:'#a42a3d',fontSize:13}}>{error}</p>}
   {message&&<p role="status" style={{margin:0,color:'#865a16',fontSize:13}}>{message}</p>}

   {!loading&&completed&&<div style={{display:'grid',gap:6,padding:12,borderRadius:10,background:'#e9f8ef',border:'1px solid #b0dfc2',color:'#13633a'}}>
    <strong><CheckCircle2 size={18} style={{display:'inline',verticalAlign:'middle',marginRight:7}}/>Concluído</strong>
    {recorded&&<span>Alunos atendidos: <strong>{state.attendance?.actual_students}</strong></span>}
   </div>}
   {!loading&&!completed&&!eventId&&<p style={{margin:0,fontSize:13,color:'#895c1b'}}>
    Esta reserva ainda não está vinculada ao evento. Regularize em Ver reserva.
   </p>}
   {!loading&&!completed&&eventId&&!state?.canClose&&<p role="status" style={{margin:0,fontSize:13,color:'#895c1b'}}>
    {state?.blockedReason||'A conclusão ainda não está disponível para esta apresentação.'}
   </p>}
   {!loading&&!completed&&state?.canClose&&<form onSubmit={event=>{event.preventDefault();void conclude();}} style={{display:'grid',gap:14}}>
    <label style={{display:'grid',gap:6,fontSize:13,fontWeight:750}}>
     Quantidade real de alunos
     <input type="number" min={0} max={100000} step={1} required autoFocus
      value={students} onChange={event=>setStudents(event.target.value)} disabled={busy}
      placeholder="Ex.: 120" style={{padding:'12px 13px',border:'1px solid #aac6ea',borderRadius:9,color:'#174779',fontSize:17,background:'#fff'}}/>
    </label>
    <div style={{display:'flex',justifyContent:'flex-end',gap:9,flexWrap:'wrap'}}>
     <button type="button" disabled={busy} onClick={dismiss} style={secondary}>Cancelar</button>
     <button type="submit" disabled={busy||!valid}
      style={{...primary,opacity:busy||!valid?0.55:1,cursor:busy||!valid?'not-allowed':'pointer'}}>
      {busy?'Salvando…':'Concluir evento'}
     </button>
    </div>
   </form>}
   {(!state?.canClose||completed)&&!loading&&<button type="button" disabled={busy} onClick={dismiss} style={secondary}>Fechar</button>}
  </div>
 </dialog>;
}
