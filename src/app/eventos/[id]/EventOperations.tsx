'use client';
import {useCallback,useEffect,useState} from 'react';
type Operation={access_instructions:string|null;parking_instructions:string|null;power_requirements:string|null;setup_notes:string|null};
type Task={id:string;label:string;done:boolean;completed_at:string|null};
type Payload={available:boolean;canEdit:boolean;operations:Operation|null;checklist:Task[];sessions:unknown[]};
const card:React.CSSProperties={background:'#f3f7ff',border:'1px solid #c9d9f5',borderRadius:12,padding:12};
export default function EventOperations({eventId}:{eventId:string}){
 const [feedbackKind,setFeedbackKind]=useState<'success'|'error'|null>(null);
 const [data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[saving,setSaving]=useState(false);

 const load=useCallback(async(signal?:AbortSignal)=>{const res=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/operacao',{signal,cache:'no-store'});const json=await res.json();if(!res.ok)throw Error(json.error||'Consulta indisponível');return json as Payload},[eventId]);
 useEffect(()=>{const ctrl=new AbortController();setLoading(true);load(ctrl.signal).then(v=>{if(ctrl.signal.aborted)return;setData(v)}).catch(e=>{if(!ctrl.signal.aborted)setError(e instanceof Error?e.message:'Consulta indisponível')}).finally(()=>{if(!ctrl.signal.aborted)setLoading(false)});return()=>ctrl.abort()},[load]);
 async function save(payload:Record<string,unknown>):Promise<boolean>{if(!data?.canEdit||saving)return false;setSaving(true);setMessage('');setFeedbackKind(null);try{const res=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/operacao/salvar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await res.json();if(!res.ok)throw Error(result.error||'Não foi possível salvar');const updated=await load();setData(updated);setMessage('Alterações salvas com sucesso!');setFeedbackKind('success');return true}catch(e){setMessage(e instanceof Error?e.message:'Erro ao salvar');setFeedbackKind('error');return false}finally{setSaving(false)}}
 if(loading)return <section style={card} role="status">Carregando preparação operacional…</section>;
 if(error)return <section style={card} role="status"><h2>Preparação operacional</h2><p>{error}</p><small>Os dados principais do evento permanecem preservados.</small></section>;
 if(!data)return null;
 const edit=data.canEdit;
 const hint=!edit?<p style={{fontSize:14,color:'#344e74'}}>Edição indisponível até a liberação segura no Neon.</p>:null;
 return <div style={{display:'grid',gap:9,fontSize:14,lineHeight:1.5}}>
 {message&&<p role={feedbackKind==='error'?'alert':'status'} aria-live="polite" style={{position:'sticky',top:12,zIndex:3,padding:'12px 16px',borderRadius:10,fontWeight:700,background:feedbackKind==='error'?'#fff0ef':'#e6f7ed',color:feedbackKind==='error'?'#9b2626':'#14633b',border:'1px solid '+(feedbackKind==='error'?'#efb3b3':'#9dd7b4')}}>{feedbackKind==='success'?'✓ ':'⚠ '}{message}</p>}
 <details open style={{...card,padding:0,overflow:'hidden',background:'linear-gradient(120deg,#e4efff,#f7faff)',border:'1px solid #8db6f6',boxShadow:'0 8px 22px rgba(16,65,147,.13)'}}><summary style={{cursor:'pointer',padding:'7px 10px',listStyle:'none',display:'grid',gap:10,background:'linear-gradient(105deg,#07357f,#0756b8)',color:'#fff'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><strong style={{fontSize:14,color:'#fff'}}>☑ Checklist operacional <span style={{fontSize:10,color:'#c5e3ff'}}>▼</span></strong><span style={{background:'#e7f2ff',color:'#12458e',padding:'5px 10px',borderRadius:99,fontSize:12,fontWeight:400}}>{data.checklist.filter(t=>t.done).length} de {data.checklist.length} concluídas</span></div><div style={{height:7,background:'rgba(255,255,255,.35)',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:(data.checklist.length?100*data.checklist.filter(t=>t.done).length/data.checklist.length:0)+'%',background:'linear-gradient(90deg,#1558c8,#23a4f2)',borderRadius:99,transition:'width .2s'}}/></div></summary><div style={{padding:'10px 12px 12px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,310px),1fr))',gap:10,alignItems:'start'}}>
<section aria-label="Itens do checklist" style={{background:'#e5f0ff',border:'1px solid #a8c8f5',borderRadius:10,padding:8}}>
<strong style={{color:'#0d438e',fontSize:13}}>Itens do checklist</strong>
{data.checklist.length?<ul style={{display:'grid',gap:3,padding:0,margin:'6px 0 0',listStyle:'none'}}>{data.checklist.map(t=><li key={t.id} style={{padding:'4px 6px',borderBottom:'1px solid #c5d9f6',overflowWrap:'anywhere',display:'flex',alignItems:'center',gap:6}}>{edit?<label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',flex:1,minWidth:0}}><input type="checkbox" disabled={saving} checked={t.done} onChange={e=>void save({action:'task',taskId:t.id,label:t.label,done:e.target.checked})}/><span style={{fontSize:13,color:'#163f7c'}}>{t.label}</span></label>:<span>{t.done?'✓ ':'○ '}{t.label}</span>}</li>)}</ul>:<p style={{fontSize:13,color:'#35577f'}}>Nenhum item cadastrado.</p>}
</section>
{hint}</div></details>

 </div>;
}
