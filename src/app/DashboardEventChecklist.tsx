'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {CheckCircle2,ChevronRight,ClipboardCheck,X} from 'lucide-react';

type Booking={id:string;event_title:string;linked_event_id?:string|null;crmDateOnly?:boolean};
type Task={id:string;label:string;done:boolean};
type Item={key:string;label:string;done:boolean;taskId:string|null};
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const normalize=(value:string)=>value.trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
const getEventId=(booking:Booking|undefined)=>{
 if(!booking)return null;
 const id=booking.crmDateOnly?booking.id.replace(/^crm-/,''):booking.linked_event_id;
 return id&&uuid.test(id)?id:null;
};

export default function DashboardEventChecklist({nextBooking}:{nextBooking:Booking|undefined}){
 const eventId=getEventId(nextBooking);
 const [model,setModel]=useState<string[]>([]);
 const [tasks,setTasks]=useState<Task[]>([]);
 const [canEdit,setCanEdit]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false);
 const [open,setOpen]=useState(false);
 const load=useCallback(async(signal?:AbortSignal)=>{
  const [modelResult,eventResult]=await Promise.allSettled([
   fetch('/api/operacao/checklist-modelo',{cache:'no-store',signal})
    .then(async res=>{if(!res.ok)throw Error('Modelo indisponível');return res.json()}),
   eventId?fetch('/api/eventos/'+encodeURIComponent(eventId)+'/operacao',{cache:'no-store',signal})
    .then(async res=>{if(!res.ok)throw Error('Checklist da apresentação indisponível');return res.json()}):Promise.resolve(null)
  ]);
  if(signal?.aborted)return;
  const template=modelResult.status==='fulfilled'&&Array.isArray(modelResult.value.items)
   ?modelResult.value.items.filter((v:unknown):v is string=>typeof v==='string'&&v.trim().length>0):[];
  const event=eventResult.status==='fulfilled'?eventResult.value:null;
  const loadedTasks=event&&Array.isArray(event.checklist)
   ?event.checklist.filter((t:unknown):t is Task=>Boolean(t&&typeof t==='object'&&typeof (t as Task).id==='string'&&typeof (t as Task).label==='string'&&typeof (t as Task).done==='boolean')):[];
  setModel(template);
  setTasks(loadedTasks);
  setCanEdit(Boolean(eventId&&event?.canEdit===true));
  setError(eventId&&eventResult.status==='rejected'?
   'Não foi possível consultar as marcações desta apresentação.':modelResult.status==='rejected'&&!loadedTasks.length?
   'Checklist indisponível no momento.':'');
 },[eventId]);
 useEffect(()=>{
  const ctrl=new AbortController();
  setLoading(true);setOpen(false);setNotice('');setTasks([]);setModel([]);setCanEdit(false);
  load(ctrl.signal).catch(()=>{if(!ctrl.signal.aborted)setError('Não foi possível consultar o checklist.')})
  .finally(()=>{if(!ctrl.signal.aborted)setLoading(false)});
  return()=>ctrl.abort();
 },[load]);
 const items=useMemo(()=>{
  const taskMap=new Map(tasks.map(task=>[normalize(task.label),task]));
  const seen=new Set<string>();
  const ordered:Item[]=[];
  for(const label of model){
   const key=normalize(label);
   if(!key||seen.has(key))continue;
   seen.add(key);
   const task=taskMap.get(key);
   ordered.push({key,label,done:task?.done??false,taskId:task?.id??null});
  }
  for(const task of tasks){
   const key=normalize(task.label);
   if(!key||seen.has(key))continue;
   seen.add(key);
   ordered.push({key,label:task.label,done:task.done,taskId:task.id});
  }
  return ordered;
 },[model,tasks]);
 async function toggle(item:Item,checked:boolean){
  if(!eventId||!canEdit||busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   const res=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/operacao/salvar',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'task',taskId:item.taskId,label:item.label,done:checked})
   });
   if(!res.ok){const body=await res.json().catch(()=>({}));throw Error(body.error||'Não foi possível salvar a marcação.')}
   await load();
   setNotice('Checklist atualizado.');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar a marcação.')}
  finally{setBusy(false)}
 }
 useEffect(()=>{
  if(!open)return;
  const keydown=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};
  window.addEventListener('keydown',keydown);
  return()=>window.removeEventListener('keydown',keydown);
 },[open]);
 const renderItem=(item:Item)=>(
  <label className="owner-check" key={item.key} style={{display:'flex',alignItems:'center',gap:8,cursor:canEdit?'pointer':'default',minWidth:0}}>
   <input type="checkbox" checked={item.done} disabled={!canEdit||busy||loading}
    onChange={event=>void toggle(item,event.target.checked)} aria-label={item.label}/>
   <span style={{overflowWrap:'anywhere'}}>{item.label}</span>
  </label>
 );
 const remaining=items.slice(4);
 const done=items.filter(item=>item.done).length;
 return <>
  <section className="owner-tile">
   <div className="owner-tile-head">
    <span className="owner-tile-icon"><ClipboardCheck size={20}/></span>
    <div><h2>Preparação da próxima sessão</h2><p>{nextBooking?.event_title||'Aguardando sessão agendada'}</p></div>
   </div>
   {loading?<p className="owner-check-note" role="status">Carregando checklist...</p>:
    items.length?items.slice(0,4).map(renderItem):
     <p className="owner-check-note">{nextBooking?'Nenhum item cadastrado para esta apresentação.':'Nenhuma apresentação futura cadastrada.'}</p>}
   {!loading&&!eventId&&items.length>0&&<p className="owner-check-note">Checklist disponível para consulta. A apresentação ainda não está vinculada.</p>}
   {!loading&&eventId&&!canEdit&&items.length>0&&<p className="owner-check-note">Marcação indisponível no momento.</p>}
   {error&&<p role="alert" style={{fontSize:12,color:'#a42a3e',margin:'8px 0'}}>{error}</p>}
   {notice&&!open&&<p role="status" style={{fontSize:12,color:'#176a49',margin:'8px 0'}}>{notice}</p>}
   <button type="button" className="owner-check-action" onClick={()=>setOpen(true)} disabled={loading||items.length===0}>
    <ClipboardCheck size={15}/>Abrir checklist <ChevronRight size={15}/>
   </button>
  </section>
  {open&&<div role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false)}}
   style={{position:'fixed',inset:0,zIndex:1600,display:'grid',placeItems:'center',padding:16,background:'rgba(6,24,59,.7)'}}>
   <section role="dialog" aria-modal="true" aria-labelledby="dashboard-checklist-title"
    style={{width:'min(100%,560px)',maxHeight:'85vh',overflow:'hidden',display:'flex',flexDirection:'column',background:'#f7faff',color:'#17447e',border:'1px solid #c2d9fa',borderRadius:15,boxShadow:'0 25px 65px rgba(6,29,65,.35)'}}>
    <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:'15px 18px',background:'linear-gradient(110deg,#10336e,#2676d2)',color:'#fff'}}>
     <div><span style={{fontSize:10,letterSpacing:1,fontWeight:750,color:'#c8e2ff'}}>PRÓXIMA APRESENTAÇÃO</span>
      <h2 id="dashboard-checklist-title" style={{color:'#fff',fontSize:20,margin:'3px 0 0'}}>Checklist operacional</h2></div>
     <button autoFocus type="button" aria-label="Fechar checklist" onClick={()=>setOpen(false)}
      style={{display:'grid',placeItems:'center',width:32,height:32,background:'#ecf4ff',color:'#184b8a',border:'1px solid #c5dafa',borderRadius:8,cursor:'pointer'}}><X size={18}/></button>
    </header>
    <div style={{padding:'16px 18px',overflowY:'auto'}}>
     <strong style={{fontSize:15}}>{nextBooking?.event_title||'Modelo padrão'}</strong>
     <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',margin:'8px 0 14px',fontSize:13,color:'#5a779f'}}>
      <span>Demais itens do checklist</span><span>{done} de {items.length} conferidos</span>
     </div>
     {remaining.length?<div style={{display:'grid',gap:6}}>{remaining.map(renderItem)}</div>:
      <p style={{fontSize:14,color:'#496a95'}}>Todos os itens já estão visíveis na página inicial.</p>}
     {!canEdit&&<p style={{fontSize:13,color:'#a15a12',marginTop:12}}>Somente consulta. As marcações não estão habilitadas nesta apresentação.</p>}
     {error&&<p role="alert" style={{fontSize:13,color:'#a42a3e',marginTop:12}}>{error}</p>}
     {notice&&<p role="status" style={{fontSize:12,color:'#176a49',marginTop:12}}><CheckCircle2 size={14} style={{display:'inline',verticalAlign:'middle'}}/> {notice}</p>}
    </div>
    <footer style={{padding:'12px 18px',borderTop:'1px solid #d1e0f8'}}>
     <button type="button" onClick={()=>setOpen(false)} style={{display:'block',width:'100%',padding:'10px 16px',borderRadius:9,border:'1px solid #bdd4f7',background:'#e8f1ff',color:'#174b90',fontWeight:750,cursor:'pointer'}}>Fechar</button>
    </footer>
   </section>
  </div>}
 </>;
}
