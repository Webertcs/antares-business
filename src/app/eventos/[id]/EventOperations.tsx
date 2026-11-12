'use client';
import {useCallback,useEffect,useState} from 'react';
type Operation={access_instructions:string|null;parking_instructions:string|null;power_requirements:string|null;setup_notes:string|null};
type Task={id:string;label:string;done:boolean;completed_at:string|null};
type Payload={available:boolean;canEdit:boolean;operations:Operation|null;checklist:Task[];sessions:unknown[]};
const card:React.CSSProperties={background:'#f3f7ff',border:'1px solid #c9d9f5',borderRadius:12,padding:12};
export default function EventOperations({eventId}:{eventId:string}){
 const [syncing,setSyncing]=useState(false);
 const [pendingItems,setPendingItems]=useState<string[]|null>(null);
 const [feedbackKind,setFeedbackKind]=useState<'success'|'error'|null>(null);
 const [data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[saving,setSaving]=useState(false);

 const load=useCallback(async(signal?:AbortSignal)=>{const res=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/operacao',{signal,cache:'no-store'});const json=await res.json();if(!res.ok)throw Error(json.error||'Consulta indisponível');return json as Payload},[eventId]);
 useEffect(()=>{const ctrl=new AbortController();setLoading(true);load(ctrl.signal).then(v=>{if(ctrl.signal.aborted)return;setData(v)}).catch(e=>{if(!ctrl.signal.aborted)setError(e instanceof Error?e.message:'Consulta indisponível')}).finally(()=>{if(!ctrl.signal.aborted)setLoading(false)});return()=>ctrl.abort()},[load]);
 async function save(payload:Record<string,unknown>):Promise<boolean>{if(!data?.canEdit||saving)return false;setSaving(true);setMessage('');setFeedbackKind(null);try{const res=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/operacao/salvar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await res.json();if(!res.ok)throw Error(result.error||'Não foi possível salvar');const updated=await load();setData(updated);setMessage('Alterações salvas com sucesso!');setFeedbackKind('success');return true}catch(e){setMessage(e instanceof Error?e.message:'Erro ao salvar');setFeedbackKind('error');return false}finally{setSaving(false)}}
 async function syncChecklist(){
  if(!data?.canEdit||saving||syncing)return;
  setSyncing(true);setMessage('');setFeedbackKind(null);
  try{
   const response=await fetch('/api/operacao/checklist-modelo',{cache:'no-store'});
   const model=await response.json();
   if(!response.ok)throw Error(model.error||'Não foi possível carregar o modelo padrão.');
   if(!Array.isArray(model.items)||model.items.some((x:unknown)=>typeof x!=='string'))throw Error('Modelo padrão inválido.');
   const normalize=(s:string)=>s.trim().replace(/\\s+/g,' ').toLocaleLowerCase('pt-BR');
   const existing=new Set(data.checklist.map(t=>normalize(t.label)));
   const missing:string[]=[];
   for(const raw of model.items as string[]){const label=raw.trim();const key=normalize(label);if(label&&key&&!existing.has(key)){missing.push(label);existing.add(key);}}
   if(!missing.length){setMessage('Checklist já atualizado. Nenhum item novo.');setFeedbackKind('success');return;}
   if(data.checklist.length+missing.length>100)throw Error('Limite de 100 itens por evento. Revise o modelo antes de atualizar.');
   setPendingItems(missing);
  }catch(e){setMessage(e instanceof Error?e.message:'Erro ao consultar modelo.');setFeedbackKind('error');}
  finally{setSyncing(false);}
 }
 async function confirmChecklist(){
  if(!pendingItems||syncing)return;
  const missing=pendingItems;
  setSyncing(true);setPendingItems(null);
  try{
   let added=0;
   for(const label of missing){
    const res=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/operacao/salvar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'task',taskId:null,label,done:false})});
    if(!res.ok){const result=await res.json().catch(()=>({}));throw Error((result.error||'Falha ao incluir item.')+' '+added+' de '+missing.length+' itens adicionados.');}
    added++;
   }
   setData(await load());setMessage(added+' novo(s) item(ns) adicionados.');setFeedbackKind('success');
  }catch(e){try{setData(await load())}catch{}setMessage(e instanceof Error?e.message:'Erro ao atualizar checklist.');setFeedbackKind('error');}
  finally{setSyncing(false);}
 }
 if(loading)return <section style={card} role="status">Carregando preparação operacional…</section>;
 if(error)return <section style={card} role="status"><h2>Preparação operacional</h2><p>{error}</p><small>Os dados principais do evento permanecem preservados.</small></section>;
 if(!data)return null;
 const edit=data.canEdit;
 const hint=!edit?<p style={{fontSize:14,color:'#344e74'}}>Edição indisponível até a liberação segura no Neon.</p>:null;
 return <div className="antares-event-center-operation" style={{display:'grid',gap:9,fontSize:14,lineHeight:1.5}}>
 {pendingItems&&<div role="dialog" aria-modal="true" aria-labelledby="checklist-update-title" style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(5,21,52,.65)',display:'grid',placeItems:'center',padding:16}}><div style={{width:'min(100%,460px)',background:'#fff',color:'#163968',borderRadius:15,overflow:'hidden',boxShadow:'0 16px 42px rgba(7,30,74,.35)'}}><div style={{background:'linear-gradient(110deg,#0d347e,#1766c5)',padding:'17px 22px',color:'#fff'}}><h3 id="checklist-update-title" style={{margin:0,fontSize:19}}>Atualizar checklist</h3></div><div style={{padding:22}}><p style={{fontSize:15,lineHeight:1.6,margin:'0 0 12px'}}>Adicionar <strong>{pendingItems.length} novo(s) item(ns)</strong> ao checklist deste evento?</p><p style={{fontSize:13,color:'#42618b',margin:'0 0 18px'}}>Os itens existentes e as marcações concluídas serão preservados.</p><div style={{display:'flex',justifyContent:'flex-end',gap:10}}><button type="button" onClick={()=>setPendingItems(null)} style={{padding:'9px 15px',borderRadius:8,border:'1px solid #b8cdee',background:'#fff',color:'#174985',fontWeight:700}}>Voltar</button><button type="button" onClick={()=>void confirmChecklist()} style={{padding:'9px 15px',borderRadius:8,border:0,background:'#195ac2',color:'#fff',fontWeight:700}}>Confirmar atualização</button></div></div></div></div>}
 {message&&<p role={feedbackKind==='error'?'alert':'status'} aria-live="polite" style={{position:'sticky',top:12,zIndex:3,padding:'12px 16px',borderRadius:10,fontWeight:700,background:feedbackKind==='error'?'#fff0ef':'#e6f7ed',color:feedbackKind==='error'?'#9b2626':'#14633b',border:'1px solid '+(feedbackKind==='error'?'#efb3b3':'#9dd7b4')}}>{feedbackKind==='success'?'✓ ':'⚠ '}{message}</p>}
 <details className="antares-event-center-checklist" open style={{...card,padding:0,overflow:'hidden',background:'linear-gradient(120deg,#e4efff,#f7faff)',border:'1px solid #8db6f6',boxShadow:'0 8px 22px rgba(16,65,147,.13)'}}><summary style={{cursor:'pointer',padding:'7px 10px',listStyle:'none',display:'grid',gap:10,background:'linear-gradient(105deg,#07357f,#0756b8)',color:'#fff'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><strong style={{fontSize:14,color:'#fff'}}>☑ Checklist operacional <span style={{fontSize:10,color:'#c5e3ff'}}>▼</span></strong><span style={{background:'#e7f2ff',color:'#12458e',padding:'5px 10px',borderRadius:99,fontSize:12,fontWeight:400}}>{data.checklist.filter(t=>t.done).length} de {data.checklist.length} concluídas</span></div><div style={{height:7,background:'rgba(255,255,255,.35)',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:(data.checklist.length?100*data.checklist.filter(t=>t.done).length/data.checklist.length:0)+'%',background:'linear-gradient(90deg,#1558c8,#23a4f2)',borderRadius:99,transition:'width .2s'}}/></div></summary><div style={{padding:'10px 12px 12px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,310px),1fr))',gap:10,alignItems:'start'}}>
<section aria-label="Itens do checklist" style={{background:'#e5f0ff',border:'1px solid #a8c8f5',borderRadius:10,padding:8}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}><strong style={{color:'#0d438e',fontSize:13}}>Itens do checklist</strong>{edit&&<button type="button" disabled={saving||syncing} onClick={()=>void syncChecklist()} style={{background:'#1761bc',color:'#fff',border:0,borderRadius:7,padding:'5px 9px',fontSize:12,fontWeight:700,cursor:'pointer',opacity:saving||syncing?.6:1}}>{syncing?'Atualizando…':'↻ Atualizar checklist'}</button>}</div>
{data.checklist.length?<ul style={{display:'grid',gap:3,padding:0,margin:'6px 0 0',listStyle:'none'}}>{data.checklist.map(t=><li key={t.id} style={{padding:'4px 6px',borderBottom:'1px solid #c5d9f6',overflowWrap:'anywhere',display:'flex',alignItems:'center',gap:6}}>{edit?<label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',flex:1,minWidth:0}}><input type="checkbox" disabled={saving} checked={t.done} onChange={e=>void save({action:'task',taskId:t.id,label:t.label,done:e.target.checked})}/><span style={{fontSize:13,color:'#163f7c'}}>{t.label}</span></label>:<span>{t.done?'✓ ':'○ '}{t.label}</span>}</li>)}</ul>:<p style={{fontSize:13,color:'#35577f'}}>Nenhum item cadastrado.</p>}
</section>
{hint}</div></details>

 </div>;
}
