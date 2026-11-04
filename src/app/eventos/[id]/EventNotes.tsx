'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function EventNotes({eventId,initialNotes,canEdit}:{eventId:string;initialNotes:string;canEdit:boolean}){
 const [notes,setNotes]=useState(initialNotes),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(''),[failed,setFailed]=useState(false);
 const router=useRouter();
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setFeedback('');
  try{
   const res=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/operacao/salvar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'notes',notes})});
   const json=await res.json();if(!res.ok)throw Error(json.error||'Falha ao salvar');
   setFailed(false);setFeedback('Observação salva com sucesso.');router.refresh();
  }catch(e){setFailed(true);setFeedback(e instanceof Error?e.message:'Erro ao salvar')}
  finally{setBusy(false)}
 }
 return <details style={{border:'1px solid #9cbff3',borderRadius:16,overflow:'hidden',background:'linear-gradient(120deg,#e1efff,#f3f8ff)',boxShadow:'0 6px 20px rgba(25,67,140,.09)'}}>
 <summary style={{cursor:'pointer',padding:'16px 18px',fontWeight:800,color:'#123b7d',background:'linear-gradient(90deg,#cfe3ff,#e9f3ff)'}}>📝 Observações <span style={{fontWeight:500,fontSize:12}}>· {initialNotes?'Registro existente':'Nenhuma observação'}</span></summary>
 <div style={{padding:'16px 18px'}}>
 {canEdit?<form onSubmit={submit} style={{display:'grid',gap:12}}>
 <label htmlFor="antares-event-notes" style={{fontWeight:700,color:'#153e7c'}}>Observações do evento</label>
 <textarea id="antares-event-notes" rows={4} maxLength={4000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Ex.: Orientações, ocorrências e informações importantes para a equipe." style={{width:'100%',padding:12,border:'1px solid #9cbcf0',borderRadius:10,background:'#fff',color:'#173668',resize:'vertical'}}/>
 <button type="submit" disabled={busy||notes===initialNotes} style={{justifySelf:'start',padding:'11px 18px',border:0,borderRadius:10,fontWeight:800,color:'#fff',background:'linear-gradient(135deg,#2875e7,#073f9b)',opacity:busy||notes===initialNotes?.65:1}}>{busy?'Salvando…':'Salvar observação'}</button>
 </form>:<p style={{whiteSpace:'pre-wrap',color:'#173668'}}>{initialNotes||'Nenhuma observação registrada.'}</p>}
 {feedback&&<p role={failed?'alert':'status'} style={{marginTop:10,fontWeight:700,color:failed?'#a02c2c':'#14633b'}}>{feedback}</p>}
 </div></details>;
}
