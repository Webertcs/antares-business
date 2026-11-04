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
 return <section aria-label="Observações do evento" style={{border:'1px solid #8db6f6',borderRadius:16,overflow:'hidden',background:'linear-gradient(120deg,#e4efff,#f7faff)',boxShadow:'0 8px 22px rgba(16,65,147,.13)'}}>
 <div style={{padding:'9px 12px',fontWeight:800,color:'#fff',background:'linear-gradient(105deg,#07357f,#0756b8)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
 <strong style={{fontSize:14,color:'#fff'}}>📝 Observações</strong>
 <span style={{fontSize:12,color:'#d9eaff'}}>{notes.trim()?'Aviso operacional':'Nenhuma observação'}</span>
 </div>
 <div style={{padding:'9px 12px'}}>
 <div role="note" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',lineHeight:1.45,fontSize:10,padding:'8px 10px',border:'1px solid #a9c8f6',borderRadius:10,background:'#dcecff',color:'#123b7d',fontWeight:notes.trim()?700:400}}>
 {notes.trim()||'Nenhuma observação registrada para este evento.'}
 </div>
 {canEdit&&<details style={{marginTop:12}}>
 <summary style={{cursor:'pointer',fontWeight:700,color:'#154a9a',padding:'4px 0',fontSize:12}}>{notes.trim()?'Editar observação':'Criar observação'}</summary>
 <form onSubmit={submit} style={{display:'grid',gap:12,marginTop:10}}>
 <label htmlFor="antares-event-notes" style={{fontWeight:700,color:'#153e7c'}}>Observações do evento</label>
 <textarea id="antares-event-notes" rows={4} maxLength={4000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Ex.: Orientações, ocorrências e informações importantes para a equipe." style={{width:'100%',padding:12,border:'1px solid #9cbcf0',borderRadius:10,background:'#fff',color:'#173668',resize:'vertical'}}/>
 <button type="submit" disabled={busy||notes===initialNotes} style={{justifySelf:'start',padding:'6px 10px',fontSize:12,border:0,borderRadius:10,fontWeight:800,color:'#fff',background:'linear-gradient(135deg,#2875e7,#073f9b)',opacity:busy||notes===initialNotes?.65:1}}>{busy?'Salvando…':'Salvar observação'}</button>
 </form></details>}
 {feedback&&<p role={failed?'alert':'status'} style={{marginTop:10,fontWeight:700,color:failed?'#a02c2c':'#14633b'}}>{feedback}</p>}
 </div></section>;
}
