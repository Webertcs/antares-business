'use client';
import {useCallback,useEffect,useState} from 'react';
type Closing={status:string;attendance:{actual_students:number;closed_at:string}|null;canClose:boolean};
export default function EventClosing({eventId}:{eventId:string}){
 const [data,setData]=useState<Closing|null>(null),[error,setError]=useState(''),[open,setOpen]=useState(false),[students,setStudents]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const load=useCallback(async(signal?:AbortSignal)=>{
  const r=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/encerramento',{cache:'no-store',signal});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Consulta indisponível');return d as Closing;
 },[eventId]);
 useEffect(()=>{const ctrl=new AbortController();load(ctrl.signal).then(d=>{if(!ctrl.signal.aborted)setData(d)}).catch(e=>{if(!ctrl.signal.aborted)setError(e instanceof Error?e.message:'Consulta indisponível')});return()=>ctrl.abort()},[load]);
 async function closeEvent(){
  const n=Number(students);if(!/^\d+$/.test(students)||!Number.isSafeInteger(n)||n>100000)return;
  setBusy(true);setMessage('');
  try{
   const r=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/encerramento',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({students:n})});
   const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível encerrar');
   setData(await load());setOpen(false);setMessage('Evento encerrado e presença registrada.');
  }catch(e){setMessage(e instanceof Error?e.message:'Erro no encerramento')}finally{setBusy(false)}
 }
 return <section style={{border:'1px solid #9abdec',borderRadius:12,padding:14,background:'linear-gradient(120deg,#e4efff,#f7faff)',color:'#173668'}}>
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
   <div><strong style={{fontSize:16}}>Encerramento e alunos atendidos</strong><p style={{fontSize:13,margin:'5px 0'}}>Registre o total real uma vez por evento. A data da visita também servirá ao ciclo de fidelização.</p></div>
   {data?.attendance?<strong>{data.attendance.actual_students} alunos atendidos</strong>:<button type="button" disabled={!data?.canClose||busy||data.status==='completed'} onClick={()=>setOpen(true)} style={{padding:'10px 14px',border:0,borderRadius:9,color:'#fff',background:data?.canClose?'#1554b0':'#7088ad',fontWeight:700,cursor:data?.canClose?'pointer':'not-allowed'}}>Encerrar evento</button>}
  </div>
  {data?.status==='completed'&&!data.attendance&&<p style={{fontSize:13}}>Evento já marcado como realizado. O registro de presença requer conferência antes de qualquer atualização.</p>}
  {!data?.canClose&&!data?.attendance&&<p style={{fontSize:12,color:'#526888',marginBottom:0}}>Encerramento protegido: disponível após implantação e homologação da função segura no Neon.</p>}
  {error&&<p role="status" style={{fontSize:12}}>{error}</p>}{message&&<p role="status">{message}</p>}
  {open&&<div role="presentation" style={{position:'fixed',inset:0,zIndex:1000,display:'grid',placeItems:'center',background:'rgba(5,22,54,.65)',padding:20}}>
   <div role="dialog" aria-modal="true" aria-labelledby="closing-title" style={{background:'#fff',padding:24,borderRadius:16,width:'min(100%,460px)',boxShadow:'0 20px 60px #0005'}}>
    <h2 id="closing-title" style={{margin:'0 0 8px',fontSize:21}}>Encerrar apresentação</h2>
    <p>Informe o total de alunos que realmente participaram neste evento, somando todas as sessões sem duplicar participantes.</p>
    <label style={{display:'grid',gap:6,fontWeight:700}}>Alunos atendidos<input autoFocus type="number" min="0" max="100000" step="1" required value={students} onChange={e=>setStudents(e.target.value)} style={{padding:12,border:'1px solid #94add5',borderRadius:8}}/></label>
    {message&&<p role="alert">{message}</p>}
    <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:18}}>
     <button type="button" disabled={busy} onClick={()=>{setOpen(false);setMessage('')}}>Cancelar</button>
     <button type="button" disabled={busy||!/^\d+$/.test(students)||Number(students)>100000} onClick={()=>void closeEvent()} style={{background:'#1554b0',color:'#fff',padding:'10px 14px',border:0,borderRadius:9,fontWeight:700}}>{busy?'Salvando…':'Confirmar encerramento'}</button>
    </div>
   </div>
  </div>}
 </section>
}
