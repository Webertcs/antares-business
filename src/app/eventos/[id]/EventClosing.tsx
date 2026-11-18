'use client';
import {useCallback,useEffect,useState} from 'react';
import type {FormEvent} from 'react';

type Attendance={actual_students:number;closed_at:string};
type Closing={status:string;attendance:Attendance|null;canClose:boolean;canCorrect?:boolean};

const fieldStyle:React.CSSProperties={width:'100%',maxWidth:260,minHeight:43,padding:'9px 12px',border:'1px solid #95b6e4',borderRadius:9,background:'#fff',color:'#173668',fontSize:17,fontWeight:750};
const primaryStyle:React.CSSProperties={minHeight:43,padding:'10px 16px',border:0,borderRadius:9,background:'#1758b6',color:'#fff',fontWeight:750,cursor:'pointer'};

export default function EventClosing({eventId,eventDate}:{eventId:string;eventDate:string|null}){
 const [data,setData]=useState<Closing|null>(null);
 const [students,setStudents]=useState('');
 const [correcting,setCorrecting]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const load=useCallback(async(signal?:AbortSignal)=>{
  const response=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/encerramento',{cache:'no-store',signal});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'Não foi possível consultar a contagem.');
  return result as Closing;
 },[eventId]);

 useEffect(()=>{
  const controller=new AbortController();
  void load(controller.signal).then(result=>{
   if(!controller.signal.aborted)setData(result);
  }).catch(cause=>{
   if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:'Consulta indisponível.');
  });
  return ()=>controller.abort();
 },[load]);

 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const upcoming=!!eventDate&&eventDate>today;
 const cancelled=data?.status==='cancelled'||data?.status==='canceled';
 const recorded=!!data?.attendance;
 const allowed=!!data?.canClose&&!recorded;
 const valid=/^\d+$/.test(students)&&Number.isSafeInteger(Number(students))&&Number(students)<=100000&&
  (!correcting||Number(students)!==data?.attendance?.actual_students);
 let situation='Consultando evento…';
 if(data){
  if(recorded)situation='Concluído';
  else if(cancelled)situation='Cancelado';
  else if(data.status==='completed')situation='Realizado';
  else if(allowed)situation='Pronto para concluir';
  else if(upcoming)situation='Agendado';
  else if(data.status==='confirmed'||data.status==='reserved')situation='Aguardando encerramento';
  else situation='Aguardando confirmação';
 }

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy||!valid||(!allowed&&!correcting)||(correcting&&!data?.canCorrect))return;
  setBusy(true);setError('');setMessage('');
  try{
   const suffix=correcting?'/corrigir':'';
   const response=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/encerramento'+suffix,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({students:Number(students)})
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error||(correcting?'Não foi possível corrigir.':'Não foi possível concluir.'));
   const updated=await load();
   setData(updated);
   setCorrecting(false);
   setStudents('');
   setMessage(correcting?'Contagem corrigida. Histórico preservado.':'Evento concluído. Alunos registrados.');
  }catch(cause){
   setError(cause instanceof Error?cause.message:'Não foi possível salvar a contagem.');
  }finally{
   setBusy(false);
  }
 }

 return <section className="antares-event-center-closing" aria-label="Contagem final de alunos" style={{border:'1px solid #bfd6f5',borderRadius:14,overflow:'hidden',background:'#f8fbff',color:'#173668'}}>
  <header style={{padding:'13px 17px',background:'linear-gradient(110deg,#103b86,#1763b8)',color:'#fff'}}>
   <strong style={{fontSize:16}}>Alunos atendidos</strong>
  </header>
  <div style={{padding:'17px',display:'grid',gap:14}}>
   <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
    <div>
     <div style={{fontSize:12,fontWeight:750,color:'#4c6b97',marginBottom:3}}>Situação</div>
     <strong style={{fontSize:18,color:recorded?'#166747':'#173668'}}>{situation}</strong>
    </div>
    {recorded&&!correcting&&<div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
     <div style={{background:'#e9f7f0',border:'1px solid #b7dfc9',padding:'8px 14px',borderRadius:10,textAlign:'center'}}>
      <strong style={{display:'block',fontSize:25,color:'#146640',lineHeight:1.15}}>{data?.attendance?.actual_students}</strong>
      <span style={{fontSize:12,color:'#146640'}}>Alunos registrados</span>
     </div>
     {data?.canCorrect&&<button type="button" className="antares-event-secondary" onClick={()=>{
      setStudents(String(data.attendance?.actual_students??''));setCorrecting(true);setError('');setMessage('');
     }} style={{padding:'9px 12px',borderRadius:8,border:'1px solid #abc5e9',background:'#fff',color:'#1854a0',fontWeight:700}}>Corrigir contagem</button>}
    </div>}
   </div>
   {(allowed||correcting)&&<form onSubmit={submit} style={{display:'flex',alignItems:'end',gap:10,flexWrap:'wrap'}}>
    <label style={{display:'grid',gap:6,flex:'1 1 170px',maxWidth:260,fontSize:13,fontWeight:700,color:'#315989'}}>
     Quantidade de alunos
     <input aria-label="Quantidade de alunos atendidos" autoFocus={correcting} type="number" min="0" max="100000" step="1" required placeholder="Ex.: 450" value={students} onChange={event=>setStudents(event.target.value)} style={fieldStyle}/>
    </label>
    <button type="submit" disabled={busy||!valid} style={{...primaryStyle,opacity:busy||!valid?.55:1,cursor:busy||!valid?'not-allowed':'pointer'}}>
     {busy?'Salvando…':correcting?'Salvar correção':'Concluir evento'}
    </button>
    {correcting&&<button type="button" disabled={busy} onClick={()=>{setCorrecting(false);setStudents('');setError('');}} className="antares-event-secondary" style={{padding:'10px 12px',minHeight:43,border:'1px solid #bad0ee',borderRadius:9,background:'#fff',color:'#315989'}}>Voltar</button>}
   </form>}
   {!recorded&&!allowed&&!correcting&&data&&(
    <p style={{fontSize:13,margin:0,color:'#4c668b'}}>
     {cancelled?'Este evento foi cancelado.':data.status==='completed'?'Este evento já foi realizado. A contagem precisa de conferência.':upcoming?'A contagem será liberada depois do evento.':'O registro da contagem ainda não está disponível.'}
    </p>
   )}
   {error&&<p role="alert" style={{fontSize:13,margin:0,color:'#a33333'}}>{error}</p>}
   {message&&<p role="status" style={{fontSize:13,margin:0,color:'#176647'}}>{message}</p>}
  </div>
 </section>;
}
