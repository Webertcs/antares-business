'use client';

import {useEffect,useRef,useState} from 'react';
import {CheckCircle2,ClipboardCheck,X} from 'lucide-react';
import type {ServiceReservation} from './ServiceBooking';

type ClosingState={
 status:string;
 attendance:{actual_students:number;closed_at:string}|null;
 canClose:boolean;
 diagnostics?:{checks:{confirmed:boolean;dateEligible:boolean;featureEnabled:boolean}};
};
const dateTime=(value:string)=>new Intl.DateTimeFormat('pt-BR',{
 dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'
}).format(new Date(value));
const mainButton:React.CSSProperties={border:'1px solid #1754a8',background:'#1760bb',color:'#fff',borderRadius:9,padding:'10px 15px',fontWeight:750,cursor:'pointer'};
const secondary:React.CSSProperties={...mainButton,background:'#e8f2ff',color:'#184988',borderColor:'#b0cbea'};

export default function ServiceClosing({reservation,institution,onClose,onSaved}:{
 reservation:ServiceReservation;institution:string;onClose:()=>void;onSaved:()=>void;
}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [state,setState]=useState<ClosingState|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [students,setStudents]=useState('');
 const [notice,setNotice]=useState('');
 const eventId=reservation.crm_event_id;
 const completed=reservation.crm_event_status==='completed'||reservation.status==='completed';
 useEffect(()=>{
  const el=dialog.current;
  if(el&&!el.open)el.showModal();
  let live=true;
  void (async()=>{
   if(!eventId){setLoading(false);return;}
   try{
    const res=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/encerramento',{cache:'no-store'});
    const json=await res.json();
    if(!res.ok)throw Error(json.error||'Encerramento indisponível.');
    if(live)setState(json as ClosingState);
   }catch(e){if(live)setError(e instanceof Error?e.message:'Não foi possível consultar o encerramento.');}
   finally{if(live)setLoading(false);}
  })();
  return()=>{live=false;if(el?.open)el.close();};
 },[eventId]);

 async function close(){
  if(busy||!eventId||!state?.canClose)return;
  const count=Number(students);
  if(!/^\d+$/.test(students)||!Number.isSafeInteger(count)||count<0||count>100000)return;
  setBusy(true);setError('');setNotice('');
  try{
   const res=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/encerramento',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({students:count})
   });
   const json=await res.json();
   if(!res.ok)throw Error(json.error||'Encerramento não realizado.');
   const check=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/encerramento',{cache:'no-store'});
   const newState=await check.json();
   if(!check.ok||newState.status!=='completed'||!newState.attendance)
    throw Error('Encerramento enviado, mas ainda não foi possível confirmar no histórico. Confira a Central do Evento antes de repetir.');
   setState(newState as ClosingState);
   setNotice('Apresentação encerrada. Quantidade real de alunos registrada no histórico operacional.');
   onSaved();
  }catch(e){setError(e instanceof Error?e.message:'Encerramento recusado.');}
  finally{setBusy(false);}
 }
 function dismiss(){
  if(busy)return;
  onClose();
 }

 return <dialog ref={dialog} aria-labelledby="central-closing-heading"
  onCancel={e=>{e.preventDefault();dismiss();}}
  style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',margin:0,
   width:'min(100% - 24px,570px)',maxHeight:'90dvh',overflowY:'auto',padding:0,
   border:0,borderRadius:16,background:'#f9fbff',color:'#173b73',boxShadow:'0 22px 65px #061b4680'}}>
  <header style={{padding:'16px 19px',background:'linear-gradient(110deg,#10336e,#2376d3)',
   display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,color:'#fff'}}>
   <div style={{display:'flex',alignItems:'center',gap:10}}>
    <ClipboardCheck size={24} aria-hidden="true"/>
    <div><small style={{fontSize:11,opacity:.85,fontWeight:750}}>CENTRAL DE ATENDIMENTO</small>
     <h2 id="central-closing-heading" style={{margin:0,color:'#fff',fontSize:21}}>Conclusão da apresentação</h2>
    </div>
   </div>
   <button type="button" onClick={dismiss} disabled={busy} aria-label="Fechar conclusão" style={{...secondary,padding:8}}><X size={18}/></button>
  </header>
  <div style={{padding:19,display:'grid',gap:14}}>
   <div style={{border:'1px solid #c2d9f5',background:'#e9f2ff',borderRadius:10,padding:13}}>
    <strong>{institution}</strong>
    <p style={{fontSize:12,margin:'5px 0 0'}}>Apresentação prevista: {dateTime(reservation.starts_at)} · Cúpula: {reservation.dome_name||'Não informada'}</p>
   </div>
   {loading&&<p role="status">Carregando dados do evento...</p>}
   {error&&<p role="alert" style={{margin:0,padding:11,border:'1px solid #fecaca',background:'#fff1f2',color:'#9b123a',borderRadius:9}}>{error}</p>}
   {notice&&<p role="status" style={{margin:0,padding:11,border:'1px solid #b5e4c6',background:'#f0fdf4',color:'#166534',borderRadius:9}}>{notice}</p>}
   {!loading&&!eventId&&<div style={{background:'#fff7e8',border:'1px solid #ebcd94',borderRadius:10,padding:14}}>
    <strong>Reserva antiga pendente</strong>
    <p style={{margin:'8px 0 0',fontSize:13}}>
     A reserva precisa ser regularizada antes de registrar os alunos.
    </p>
    <p style={{margin:'8px 0 0',fontSize:12}}>Use Ver reserva para regularizar este registro antigo.</p>
   </div>}
   {!loading&&eventId&&(completed||state?.attendance)&&<div role="status" style={{background:'#e9f9ef',border:'1px solid #b5e4c6',padding:14,borderRadius:10,color:'#17633b'}}>
    <CheckCircle2 size={18} style={{display:'inline',verticalAlign:'middle',marginRight:7}}/>
    <strong>Apresentação concluída</strong>
    {state?.attendance&&<p style={{margin:'7px 0 0',fontSize:13}}>Alunos realmente atendidos: <strong>{state.attendance.actual_students}</strong></p>}
   </div>}
   {!loading&&eventId&&!completed&&!state?.attendance&&<div style={{display:'grid',gap:11}}>
    {state?.canClose?
     <label style={{fontSize:13,fontWeight:750}}>Número real de alunos atendidos
      <input type="number" min={0} max={100000} step={1} required
       value={students} onChange={e=>setStudents(e.target.value)}
       placeholder="Informe a quantidade" disabled={busy}
       style={{marginTop:5,width:'100%',padding:'11px 12px',border:'1px solid #aac6ea',borderRadius:9,background:'#fff',color:'#174779'}}/>
     </label>:
     <p role="status" style={{margin:0,fontSize:13,color:'#885e1c'}}>
      {state?.status==='confirmed'
       ?'Este evento ainda não pode ser concluído. O encerramento só é liberado na data da apresentação ou depois, conforme as permissões existentes.'
       :'O evento precisa estar confirmado e autorizado para encerramento.'}
     </p>}
    {state?.canClose&&<div style={{display:'flex',justifyContent:'flex-end',gap:9,flexWrap:'wrap'}}>
     <button type="button" disabled={busy} onClick={dismiss} style={secondary}>Voltar</button>
     <button type="button" disabled={busy||!/^\\d+$/.test(students)||Number(students)>100000}
       onClick={()=>void close()} style={{...mainButton,opacity:(busy||!/^\\d+$/.test(students)||Number(students)>100000)?0.55:1}}>
       {busy?'Salvando...':'Registrar alunos e concluir'}
     </button>
    </div>}
   </div>}
   <button type="button" disabled={busy} onClick={dismiss} style={secondary}>Fechar</button>
  </div>
 </dialog>;
}
