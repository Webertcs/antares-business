'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function EventLifecycleActions({eventId,status,archived=false,onChanged}:{eventId:string;status:string;archived?:boolean;onChanged?:()=>void}){
 const router=useRouter(),[action,setAction]=useState<'cancel'|'archive'|'restore'|null>(null),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const closed=['completed','cancelled','canceled'].includes(status);
 async function submit(){
  if(!action||busy)return;
  setBusy(true);setError('');
  try{
   const res=await fetch('/api/eventos/ciclo-vida',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId,action,reason})});
   const data=await res.json();if(!res.ok)throw Error(data.error||'Não foi possível concluir.');
   setAction(null);setReason('');onChanged?.();router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'Erro ao atualizar evento.');}finally{setBusy(false);}
 }
 return <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginTop:0}}>
  {archived?<button type="button" onClick={()=>{setAction('restore');setError('');}} style={{padding:'3px 6px',minHeight:25,fontSize:11,fontWeight:600,borderRadius:8,border:'1px solid #b8cdee',background:'#edf5ff',color:'#174985'}}>Restaurar</button>:<>
  {!closed&&<button type="button" onClick={()=>{setAction('cancel');setError('');}} style={{padding:'3px 6px',fontSize:11,minHeight:25,borderRadius:7,border:'1px solid #e8c6c6',background:'#fff2f2',color:'#9b3232'}}>Cancelar</button>}
  {!['confirmed','reserved','completed'].includes(status)&&<button type="button" onClick={()=>{setAction('archive');setError('');}} style={{padding:'3px 6px',fontSize:11,minHeight:25,borderRadius:7,border:'1px solid #b8cdee',background:'#edf5ff',color:'#174985'}}>Arquivar</button>}
  </>}
  {action&&<div role="dialog" aria-modal="true" aria-label="Confirmar alteração do evento" style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(5,21,52,.65)',display:'grid',placeItems:'center',padding:16}}>
   <div style={{width:'min(100%,460px)',background:'#fff',color:'#163968',padding:22,borderRadius:15,boxShadow:'0 12px 36px #071e4a55'}}>
    <h3 style={{margin:'0 0 10px'}}> {action==='cancel'?'Cancelar evento':action==='archive'?'Arquivar evento':'Restaurar evento'} </h3>
    <p style={{fontSize:14}}>{action==='cancel'?'O evento será cancelado, mas permanecerá no histórico.':action==='archive'?'O cadastro sairá das listas principais, mas não será excluído do Neon. Eventos com vínculos podem ser bloqueados.':'O evento arquivado voltará às listas principais.'}</p>
    {action==='cancel'&&<label style={{display:'block',fontSize:13,fontWeight:700}}>Motivo do cancelamento<textarea autoFocus value={reason} maxLength={1000} onChange={e=>setReason(e.target.value)} rows={4} style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:6,padding:10,border:'1px solid #aac7ed',borderRadius:8}}/></label>}
    {error&&<p role="alert" style={{color:'#a12b2b',fontSize:13}}>{error}</p>}
    <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:16}}>
     <button type="button" disabled={busy} onClick={()=>{setAction(null);setReason('');setError('');}} style={{padding:'9px 14px',border:'1px solid #b9cdec',borderRadius:8,background:'#fff',color:'#174985'}}>Voltar</button>
     <button type="button" disabled={busy||(action==='cancel'&&reason.trim().length<5)} onClick={submit} style={{padding:'9px 14px',border:0,borderRadius:8,background:'#195ac2',color:'#fff',opacity:busy?.6:1}}>{busy?'Salvando…':'Confirmar'}</button>
    </div>
   </div>
  </div>}
 </div>;
}
