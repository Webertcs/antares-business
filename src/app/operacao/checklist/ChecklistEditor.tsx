'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import EventOperations from '../../eventos/[id]/EventOperations';

export function ChecklistTemplateEditor(){
 const [items,setItems]=useState<string[]>([]);
 const [saved,setSaved]=useState<string[]>([]);
 const [newItem,setNewItem]=useState('');
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [canEdit,setCanEdit]=useState(false);
 const [message,setMessage]=useState('');
 const load=useCallback(async()=>{
  try{
   const response=await fetch('/api/operacao/checklist-modelo',{cache:'no-store'});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Erro ao carregar');
   setItems(data.items);setSaved(data.items);setCanEdit(data.canEdit);
  }catch(error){setMessage(error instanceof Error?error.message:'Falha ao carregar');}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 const changed=JSON.stringify(items)!==JSON.stringify(saved);
 function add(){
  const value=newItem.trim();
  if(value.length<2||value.length>160){setMessage('O item deve ter de 2 a 160 caracteres.');return;}
  if(items.length>=80){setMessage('Limite de 80 itens.');return;}
  setItems(previous=>[...previous,value]);setNewItem('');setMessage('');
 }
 function move(index:number,direction:number){
  const next=index+direction;
  if(next<0||next>=items.length)return;
  setItems(previous=>{const copy=[...previous];[copy[index],copy[next]]=[copy[next],copy[index]];return copy;});
 }
 async function save(){
  setSaving(true);setMessage('');
  try{
   const response=await fetch('/api/operacao/checklist-modelo',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Erro ao salvar');
   setSaved([...items]);setMessage('Modelo padrão salvo com sucesso.');
  }catch(error){setMessage(error instanceof Error?error.message:'Falha ao salvar');}
  finally{setSaving(false);}
 }
 const button:React.CSSProperties={border:'1px solid #b8d0f4',borderRadius:8,padding:'5px 9px',color:'#174987',background:'#fff',cursor:'pointer'};
 return <section className="operation-premium-checklist" style={{background:'#eef5ff',border:'1px solid #c9dcf7',borderRadius:14,padding:18,marginTop:12}}>
  <h2 style={{fontSize:19,fontWeight:750,margin:'0 0 8px'}}>Modelo padrão do planetário</h2>
  {loading?<p>Carregando modelo...</p>:<>
   {items.length===0&&<p style={{padding:14,background:'#fff',borderRadius:8}}>Nenhuma tarefa cadastrada.</p>}
   <div style={{display:'grid',gap:6}}>
    {items.map((item,index)=><div className="operation-premium-checklist-row" key={index} style={{display:'flex',alignItems:'center',gap:8,background:'#fff',border:'1px solid #d4e2f5',borderRadius:10,padding:5}}>
     <span style={{minWidth:22,fontWeight:700,color:'#5276a3'}}>{index+1}.</span>
     <input aria-label={`Item ${index+1}`} value={item} disabled={!canEdit} maxLength={160} onChange={e=>setItems(previous=>previous.map((v,i)=>i===index?e.target.value:v))} style={{flex:1,minWidth:0,padding:6,border:'1px solid #c8d8ef',borderRadius:7,color:'#163d73',background:'#fff'}}/>
     {canEdit&&<>
      <button type="button" className="operation-premium-move-button" aria-label={`Mover item ${index+1} para cima`} style={button} title="Mover para cima" disabled={index===0} onClick={()=>move(index,-1)}>↑</button>
      <button type="button" className="operation-premium-move-button" aria-label={`Mover item ${index+1} para baixo`} style={button} title="Mover para baixo" disabled={index===items.length-1} onClick={()=>move(index,1)}>↓</button>
      <button type="button" className="operation-premium-remove-button" aria-label={`Remover item ${index+1}`} style={{...button,color:'#a32929'}} title="Remover item" onClick={()=>setItems(previous=>previous.filter((_,i)=>i!==index))}>×</button>
     </>}
    </div>)}
   </div>
   <p style={{fontSize:13,margin:'10px 0 0',color:'#42658f'}}>{items.length} de 80 itens{changed?' · Alterações não salvas':''}</p>
   {canEdit&&<><div style={{display:'flex',gap:8,marginTop:16,flexWrap:'wrap'}}>
    <input aria-label="Nova tarefa" placeholder="Ex.: Conferir projetor e cabos" maxLength={160} value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add();}}} style={{flex:'1 1 240px',padding:12,border:'1px solid #b8d0f4',borderRadius:9,color:'#163d73',background:'#fff'}}/>
    <button className="operation-premium-add-button" type="button" onClick={add} style={{...button,background:'#dceafe',fontWeight:700}}>+ Adicionar item</button>
   </div>
   <div style={{display:'flex',gap:10,marginTop:20,alignItems:'center'}}>
    <button className="operation-premium-save-button" type="button" disabled={saving||!changed||items.some(v=>v.trim().length<2)} onClick={()=>void save()} style={{border:0,borderRadius:9,padding:'12px 20px',fontWeight:700,color:'#fff',background:'#1759bd',opacity:saving||!changed?0.6:1,cursor:'pointer'}}>{saving?'Salvando...':'Salvar modelo padrão'}</button>
    {changed&&<button className="operation-premium-discard-button" type="button" style={button} onClick={()=>{setItems([...saved]);setMessage('');}}>Descartar alterações</button>}
   </div></>}
   {message&&<p role="status" style={{fontWeight:650,margin:'14px 0 0'}}>{message}</p>}
  </>}
 </section>;
}
type EventBooking={
 proposal_id:string;
 crm_event_id:string|null;
 crm_event_status:string|null;
 starts_at:string;
 status:string;
 dome_name:string|null;
};
type ProposalForBooking={id:string;title:string;client_name:string};
type ChecklistEvent={
 id:string;title:string;client:string;date:string;dome:string;status:string
};
const dateTime=(raw:string)=>new Intl.DateTimeFormat('pt-BR',{
 day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',
 timeZone:'America/Sao_Paulo'
}).format(new Date(raw));

export default function ChecklistEditor(){
 const [mode,setMode]=useState<'events'|'model'>('events');
 const [bookings,setBookings]=useState<ChecklistEvent[]>([]);
 const [selected,setSelected]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let current=true;
  setLoading(true);setError('');
  fetch('/api/agenda/reservas',{cache:'no-store'})
   .then(async response=>{
    const result=await response.json();
    if(!response.ok)throw Error(result.error||'Não foi possível carregar as apresentações.');
    const proposals=Array.isArray(result.proposals)?result.proposals as ProposalForBooking[]:[];
    const links=Array.isArray(result.links)?result.links as EventBooking[]:[];
    const byProposal=new Map(proposals.map(p=>[p.id,p]));
    const events=links.filter(link=>
      Boolean(link.crm_event_id)&&!['cancelled','canceled','completed'].includes(link.status)&&
      !['cancelled','canceled','completed'].includes(String(link.crm_event_status||''))&&
      Number.isFinite(new Date(link.starts_at).getTime())
    ).map(link=>{
      const proposal=byProposal.get(link.proposal_id);
      return {
       id:link.crm_event_id!,
       title:proposal?.title||'Apresentação',
       client:proposal?.client_name||'Instituição',
       date:link.starts_at,
       dome:link.dome_name||'A definir',
       status:link.status
      } satisfies ChecklistEvent;
    }).sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());
    return [...new Map(events.map(event=>[event.id,event])).values()];
   })
   .then(data=>{if(current)setBookings(data)})
   .catch(e=>{if(current)setError(e instanceof Error?e.message:'Consulta indisponível')})
   .finally(()=>{if(current)setLoading(false)});
  return()=>{current=false};
 },[refresh]);
 const chosen=useMemo(()=>bookings.find(event=>event.id===selected)||null,[bookings,selected]);
 return <div style={{display:'grid',gap:14}}>
  <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',justifyContent:'space-between'}}>
   <h2 style={{fontSize:19,fontWeight:800,color:'#164b91',margin:0}}>Checklist operacional</h2>
   <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
    <button type="button" aria-pressed={mode==='events'} onClick={()=>setMode('events')} style={{background:mode==='events'?'#195cbd':'#e7f1ff',color:mode==='events'?'#fff':'#174b92',border:'1px solid #b8d0f4',borderRadius:9,padding:'9px 13px',fontWeight:700,cursor:'pointer'}}>Apresentações</button>
    <button type="button" aria-pressed={mode==='model'} onClick={()=>setMode('model')} style={{background:mode==='model'?'#195cbd':'#e7f1ff',color:mode==='model'?'#fff':'#174b92',border:'1px solid #b8d0f4',borderRadius:9,padding:'9px 13px',fontWeight:700,cursor:'pointer'}}>Editar modelo</button>
   </div>
  </div>
  {mode==='model'?<ChecklistTemplateEditor/>:
   <section style={{display:'grid',gap:11}}>
    {selected&&chosen?<div>
     <button type="button" onClick={()=>setSelected(null)} style={{border:'1px solid #b8d0f4',borderRadius:8,padding:'8px 12px',background:'#eaf3ff',color:'#194b8b',fontWeight:700,cursor:'pointer'}}>← Apresentações</button>
     <div style={{margin:'12px 0',padding:13,background:'#eaf3ff',border:'1px solid #c6daf7',borderRadius:12}}>
      <strong style={{color:'#143e81',display:'block',fontSize:17}}>{chosen.client}</strong>
      <span style={{color:'#4d6c98',fontSize:13}}>{chosen.title} · {dateTime(chosen.date)} · {chosen.dome}</span>
     </div>
     <EventOperations key={chosen.id} eventId={chosen.id}/>
    </div>:<>
     <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',flexWrap:'wrap'}}>
      <strong style={{fontSize:15,color:'#153d77'}}>Apresentações com reserva</strong>
      <button type="button" onClick={()=>setRefresh(value=>value+1)} disabled={loading} style={{background:'#e6efff',border:'1px solid #bad2f3',borderRadius:8,padding:'8px 11px',color:'#174c95',cursor:'pointer'}}>Atualizar</button>
     </div>
     {loading?<p role="status">Carregando apresentações...</p>:error?<p role="alert" style={{color:'#a32335'}}>{error}</p>:bookings.length===0?<p style={{padding:14,background:'#f0f6ff',borderRadius:10,color:'#425f88'}}>Nenhuma apresentação reservada disponível.</p>:
      <div style={{display:'grid',gap:9}}>
       {bookings.map(event=><div key={event.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',padding:13,border:'1px solid #c3d8f6',borderLeft:'3px solid #2075dd',background:'#f3f8ff',borderRadius:11}}>
        <div style={{minWidth:0,flex:'1 1 220px'}}>
         <strong style={{fontSize:15,color:'#16427c',display:'block'}}>{event.client}</strong>
         <span style={{fontSize:12,color:'#53729d'}}>{dateTime(event.date)} · {event.dome}</span>
        </div>
        <button type="button" onClick={()=>setSelected(event.id)} style={{background:'#175ab9',color:'#fff',border:0,borderRadius:9,fontWeight:700,padding:'9px 13px',cursor:'pointer'}}>Abrir checklist</button>
       </div>)}
      </div>}
    </>}
   </section>}
 </div>;
}
