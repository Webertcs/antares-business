'use client';
import {useCallback,useEffect,useState} from 'react';
type Closing={status:string;attendance:{actual_students:number;closed_at:string}|null;canClose:boolean;canCorrect?:boolean;diagnostics?:{checks:{owner:boolean;confirmed:boolean;datePresent:boolean;dateEligible:boolean;featureEnabled:boolean};eventDate:string;today:string}};
export default function EventClosing({eventId}:{eventId:string}){
 const [editing,setEditing]=useState(false);
 const [data,setData]=useState<Closing|null>(null),[error,setError]=useState(''),[open,setOpen]=useState(false),[students,setStudents]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const load=useCallback(async(signal?:AbortSignal)=>{
  const r=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/encerramento',{cache:'no-store',signal});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Consulta indisponível');return d as Closing;
 },[eventId]);
 useEffect(()=>{const ctrl=new AbortController();load(ctrl.signal).then(d=>{if(!ctrl.signal.aborted)setData(d)}).catch(e=>{if(!ctrl.signal.aborted)setError(e instanceof Error?e.message:'Consulta indisponível')});return()=>ctrl.abort()},[load]);
 async function correctAttendance(){
  const n=Number(students);
  if(!/^\d+$/.test(students)||!Number.isSafeInteger(n)||n>100000||n===data?.attendance?.actual_students)return;
  setBusy(true);setMessage('');
  try{
   const r=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/encerramento/corrigir',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({students:n})});
   const d=await r.json();if(!r.ok)throw Error(d.error||'Correção não realizada');
   setData(await load());setEditing(false);setMessage('Quantidade corrigida. Histórico de auditoria preservado.');
  }catch(e){setMessage(e instanceof Error?e.message:'Erro na correção')}finally{setBusy(false)}
 }
 async function closeEvent(){
  const n=Number(students);if(!/^\d+$/.test(students)||!Number.isSafeInteger(n)||n>100000)return;
  setBusy(true);setMessage('');
  try{
   const r=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/encerramento',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({students:n})});
   const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível encerrar');
   setData(await load());setOpen(false);setMessage('Evento encerrado e presença registrada.');
  }catch(e){setMessage(e instanceof Error?e.message:'Erro no encerramento')}finally{setBusy(false)}
 }
 return <section className="antares-event-center-closing" aria-label="Fechamento operacional e controle de público" style={{border:'1px solid #8cb7f3',borderRadius:16,overflow:'hidden',background:'linear-gradient(145deg,#f1f7ff,#ffffff)',color:'#173668',boxShadow:'0 10px 26px rgba(16,67,145,.12)'}}>
  <div style={{background:'linear-gradient(110deg,#09265f,#1353a5 72%,#1769bf)',padding:'14px 17px',color:'#fff',display:'flex',alignItems:'center',gap:11}}>
   <span aria-hidden="true" style={{fontSize:23,background:'rgba(255,255,255,.15)',borderRadius:11,padding:'7px 10px'}}>📊</span>
   <div><strong style={{fontSize:17,display:'block'}}>Fechamento operacional · Controle de público</strong><span style={{fontSize:12,color:'#d7eaff'}}>Registro oficial de alunos atendidos por evento</span></div>
  </div>
  <div style={{padding:'15px 17px',display:'grid',gap:13}}>
   <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}>
    <div style={{display:'grid',gap:5}}>
     <span style={{fontSize:12,fontWeight:800,color:'#3565a5',letterSpacing:'.04em'}}>SITUAÇÃO DO REGISTRO</span>
     <strong style={{fontSize:18,color:data?.attendance?'#136b4b':'#173668'}}>{data?.attendance?'✓ Evento encerrado · Presença registrada':data?.status==='completed'?'Evento realizado · Presença pendente':'Aguardando encerramento do evento'}</strong>
     <span style={{fontSize:13,color:'#45648a',maxWidth:560}}>A contagem registrada alimenta automaticamente a ficha da instituição, o Controle de Público geral e os relatórios de gestão.</span>
    </div>
    {data?.attendance?<div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      <div style={{padding:'9px 16px',background:'#e2f5ee',border:'1px solid #a9dcc8',borderRadius:12,textAlign:'center',minWidth:135}}><strong style={{display:'block',fontSize:26,lineHeight:1.2,color:'#126345'}}>{data.attendance.actual_students}</strong><span style={{fontSize:12,fontWeight:750,color:'#126345'}}>Alunos atendidos</span></div>
      {data.canCorrect&&<button className="antares-event-secondary" type="button" disabled={busy} onClick={()=>{setStudents(String(data.attendance?.actual_students??''));setMessage('');setEditing(true)}} style={{padding:'10px 15px',border:'1px solid #1554b0',borderRadius:9,color:'#1554b0',background:'#fff',fontWeight:800}}>Editar contagem</button>}
     </div>:<button type="button" disabled={!data?.canClose||busy||data.status==='completed'} onClick={()=>setOpen(true)} style={{padding:'13px 19px',border:0,borderRadius:10,color:'#fff',background:data?.canClose?'linear-gradient(110deg,#1252ac,#2075d4)':'#7088ad',fontWeight:800,boxShadow:data?.canClose?'0 5px 14px rgba(21,84,176,.25)':'none',cursor:data?.canClose?'pointer':'not-allowed'}}>Encerrar evento e registrar alunos</button>}
   </div>
   {data?.status==='completed'&&!data.attendance&&<p style={{fontSize:13,margin:0}}>Evento já marcado como realizado. O registro de presença requer conferência antes de qualquer atualização.</p>}
   {!data?.canClose&&!data?.attendance&&<p style={{fontSize:12,color:'#526888',margin:0}}>{data?.diagnostics&&!data.diagnostics.checks.confirmed?'Para registrar o público, o evento precisa estar confirmado.':data?.diagnostics&&!data.diagnostics.checks.dateEligible?'O registro fica disponível na data do evento ou depois dela.':data?.diagnostics&&!data.diagnostics.checks.featureEnabled?'Registro de público aguardando ativação segura no ambiente.':'Encerramento protegido: aguardando liberação segura no Neon.'}</p>}
   {error&&<p role="status" style={{fontSize:12,margin:0}}>{error}</p>}{message&&<p role="status" style={{margin:0}}>{message}</p>}
  </div>
  {editing&&<div role="presentation" style={{position:'fixed',inset:0,zIndex:1000,display:'grid',placeItems:'center',background:'rgba(5,22,54,.72)',padding:20}}>
   <div role="dialog" aria-modal="true" aria-labelledby="correct-title" style={{background:'linear-gradient(160deg,#eef5ff 0%,#f8fbff 65%,#e9f2ff 100%)',color:'#163968',border:'1px solid #8fb6ed',borderRadius:18,width:'min(100%,470px)',boxShadow:'0 24px 70px #041e4c70',overflow:'hidden'}}>
    <div style={{background:'linear-gradient(110deg,#103c85,#1764c3)',color:'#fff',padding:'19px 24px',borderBottom:'3px solid #74b4ff'}}>
     <h2 id="correct-title" style={{margin:0,fontSize:21,fontWeight:800}}>Corrigir alunos atendidos</h2>
     
    </div>
    <div style={{padding:'20px 24px 22px'}}>
     <label style={{display:'grid',gap:7,fontWeight:750,fontSize:14}}>Quantidade correta<input autoFocus type="number" min="0" max="100000" step="1" value={students} onChange={e=>setStudents(e.target.value)} style={{padding:'12px 13px',background:'#fff',color:'#173668',border:'1.5px solid #8fb6e8',borderRadius:10,fontSize:17,fontWeight:700,outlineOffset:2}}/></label>
     {message&&<p role="alert" style={{color:'#a52a37',fontWeight:650}}>{message}</p>}
     <div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:10,marginTop:22,paddingTop:16,borderTop:'1px solid #c4d9f4'}}>
      <button className="antares-event-secondary" type="button" disabled={busy} onClick={()=>{setEditing(false);setMessage('')}} style={{padding:'10px 14px',border:'1px solid #a5c4ec',borderRadius:9,background:'#fff',color:'#1a4d90',fontWeight:700}}>Cancelar</button>
      <button type="button" disabled={busy||!/^\d+$/.test(students)||Number(students)>100000||Number(students)===data?.attendance?.actual_students} onClick={()=>void correctAttendance()} style={{background:'linear-gradient(110deg,#1252ac,#2075d4)',color:'#fff',padding:'11px 19px',border:'1px solid #1554b0',borderRadius:9,fontWeight:800,boxShadow:'0 3px 9px #1458ac30',opacity:busy||!/^\d+$/.test(students)||Number(students)>100000||Number(students)===data?.attendance?.actual_students?0.6:1}}>{busy?'Salvando…':'Confirmar'}</button>
     </div>
    </div>
   </div>
  </div>}
  {open&&<div role="presentation" style={{position:'fixed',inset:0,zIndex:1000,display:'grid',placeItems:'center',background:'rgba(5,22,54,.65)',padding:20}}>
   <div role="dialog" aria-modal="true" aria-labelledby="closing-title" style={{background:'#fff',padding:24,borderRadius:16,width:'min(100%,460px)',boxShadow:'0 20px 60px #0005'}}>
    <h2 id="closing-title" style={{margin:'0 0 8px',fontSize:21}}>Encerrar apresentação</h2>
    <p>Informe o total de alunos que realmente participaram neste evento, sem contar a mesma pessoa duas vezes.</p>
    <label style={{display:'grid',gap:6,fontWeight:700}}>Alunos atendidos<input autoFocus type="number" min="0" max="100000" step="1" required value={students} onChange={e=>setStudents(e.target.value)} style={{padding:12,border:'1px solid #94add5',borderRadius:8}}/></label>
    {message&&<p role="alert">{message}</p>}
    <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:18}}>
     <button className="antares-event-secondary" type="button" disabled={busy} onClick={()=>{setOpen(false);setMessage('')}}>Cancelar</button>
     <button type="button" disabled={busy||!/^\d+$/.test(students)||Number(students)>100000} onClick={()=>void closeEvent()} style={{background:'#1554b0',color:'#fff',padding:'10px 14px',border:0,borderRadius:9,fontWeight:700}}>{busy?'Salvando…':'Confirmar encerramento'}</button>
    </div>
   </div>
  </div>}
 </section>
}
