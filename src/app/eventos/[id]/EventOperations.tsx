'use client';
import {useCallback,useEffect,useState} from 'react';
type Operation={access_instructions:string|null;parking_instructions:string|null;power_requirements:string|null;setup_notes:string|null};
type Task={id:string;label:string;done:boolean;completed_at:string|null};
type Session={id:string;label:string;starts_at:string|null;ends_at:string|null;expected_students:number|null};
type Template={id:string;name:string;items:string[]};
type Payload={available:boolean;canEdit:boolean;operations:Operation|null;checklist:Task[];sessions:Session[]};
const card:React.CSSProperties={background:'#f3f7ff',border:'1px solid #c9d9f5',borderRadius:12,padding:12};
const field:React.CSSProperties={width:'100%',padding:9,border:'1px solid #a8bfe6',borderRadius:8,background:'#fff',color:'#173a70'};
export default function EventOperations({eventId,address}:{eventId:string;address:string}){
 const [feedbackKind,setFeedbackKind]=useState<'success'|'error'|null>(null);
 const [data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[saving,setSaving]=useState(false);
 const [access,setAccess]=useState(''),[parking,setParking]=useState(''),[power,setPower]=useState(''),[setup,setSetup]=useState('');
 const [templates,setTemplates]=useState<Template[]>([]),[selectedTemplate,setSelectedTemplate]=useState(''),[templateName,setTemplateName]=useState(''),[templateItems,setTemplateItems]=useState(''),[templateBusy,setTemplateBusy]=useState(false);
 const [editingTemplate,setEditingTemplate]=useState<string|null>(null);
 const [showChecklistCreator,setShowChecklistCreator]=useState(false);
 const [editingSession,setEditingSession]=useState<string|null>(null);
 const [task,setTask]=useState(''),[session,setSession]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[students,setStudents]=useState('');
 const load=useCallback(async(signal?:AbortSignal)=>{const res=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/operacao',{signal,cache:'no-store'});const json=await res.json();if(!res.ok)throw Error(json.error||'Consulta indisponível');return json as Payload},[eventId]);
 useEffect(()=>{const ctrl=new AbortController();setLoading(true);load(ctrl.signal).then(v=>{if(ctrl.signal.aborted)return;setData(v);setAccess(v.operations?.access_instructions||'');setParking(v.operations?.parking_instructions||'');setPower(v.operations?.power_requirements||'');setSetup(v.operations?.setup_notes||'')}).catch(e=>{if(!ctrl.signal.aborted)setError(e instanceof Error?e.message:'Consulta indisponível')}).finally(()=>{if(!ctrl.signal.aborted)setLoading(false)});return()=>ctrl.abort()},[load]);
 const loadTemplates=useCallback(async()=>{const res=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/operacao/modelos',{cache:'no-store'});if(!res.ok)throw Error('Não foi possível carregar os modelos');const json=await res.json();setTemplates(json.templates||[])},[eventId]);
 useEffect(()=>{void loadTemplates().catch(()=>{})},[loadTemplates]);
 async function templateAction(action:'save'|'apply'|'delete'){
  if(!data?.canEdit||templateBusy)return;
  setTemplateBusy(true);setMessage('');setFeedbackKind(null);
  try{
   const payload=action==='save'
    ?{action,templateId:editingTemplate,name:templateName,items:templateItems.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}
    :{action,templateId:selectedTemplate};
   const res=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/operacao/modelos',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const json=await res.json();if(!res.ok)throw Error(json.error||'Falha ao processar modelo');
   await loadTemplates();if(action==='apply')setData(await load());
   if(action==='save'){setTemplateName('');setTemplateItems('');setEditingTemplate(null)}
   if(action==='delete'){setSelectedTemplate('');setEditingTemplate(null);setTemplateName('');setTemplateItems('')}
   setFeedbackKind('success');setMessage(action==='save'?'Modelo salvo com sucesso.':action==='delete'?'Modelo excluído. As tarefas dos eventos foram preservadas.':json.added===0?'Nenhuma tarefa nova adicionada. Confira se as tarefas já existem no evento.':json.added+' tarefa(s) adicionada(s) ao evento.');
  }catch(e){setFeedbackKind('error');setMessage(e instanceof Error?e.message:'Falha ao processar modelo')}
  finally{setTemplateBusy(false)}
 }
 async function save(payload:Record<string,unknown>):Promise<boolean>{if(!data?.canEdit||saving)return false;setSaving(true);setMessage('');setFeedbackKind(null);try{const res=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/operacao/salvar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await res.json();if(!res.ok)throw Error(result.error||'Não foi possível salvar');const updated=await load();setData(updated);setMessage('Alterações salvas com sucesso no CRM.');setFeedbackKind('success');return true}catch(e){setMessage(e instanceof Error?e.message:'Erro ao salvar');setFeedbackKind('error');return false}finally{setSaving(false)}}
 async function deleteSession(s:Session){
  if(!data?.canEdit||saving)return;
  if(!window.confirm('Excluir a sessão "'+s.label+'"? Esta ação não pode ser desfeita.'))return;
  setSaving(true);setMessage('');setFeedbackKind(null);
  try{
   const res=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/operacao/salvar',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'delete_session',sessionId:s.id})
   });
   const json=await res.json();if(!res.ok)throw Error(json.error||'Não foi possível excluir a sessão.');
   setData(await load());
   if(editingSession===s.id){setEditingSession(null);setSession('');setStart('');setEnd('');setStudents('')}
   setFeedbackKind('success');setMessage('Sessão excluída com sucesso. As demais sessões foram preservadas.');
  }catch(e){setFeedbackKind('error');setMessage(e instanceof Error?e.message:'Erro ao excluir sessão')}
  finally{setSaving(false)}
 }
 if(loading)return <section style={card} role="status">Carregando preparação operacional…</section>;
 if(error)return <section style={card} role="status"><h2>Preparação operacional</h2><p>{error}</p><small>Os dados principais do evento permanecem preservados.</small></section>;
 if(!data)return null;
 const op=data.operations,edit=data.canEdit;
 const hint=!edit?<p style={{fontSize:13,color:'#63738c'}}>Edição indisponível até a liberação segura no Neon.</p>:null;
 return <div style={{display:'grid',gap:9}}>
 {message&&<p role={feedbackKind==='error'?'alert':'status'} aria-live="polite" style={{position:'sticky',top:12,zIndex:3,padding:'12px 16px',borderRadius:10,fontWeight:700,background:feedbackKind==='error'?'#fff0ef':'#e6f7ed',color:feedbackKind==='error'?'#9b2626':'#14633b',border:'1px solid '+(feedbackKind==='error'?'#efb3b3':'#9dd7b4')}}>{feedbackKind==='success'?'✓ ':'⚠ '}{message}</p>}
 <details style={{...card,padding:0,overflow:'hidden',background:'linear-gradient(110deg,#e5f0ff,#f5f9ff)',boxShadow:'0 5px 18px #174a8a12'}}>
 <summary style={{cursor:'pointer',padding:'9px 12px',fontWeight:800,color:'#173668'}}>📍 Local e deslocamento <span style={{fontSize:12,fontWeight:500,color:'#5e7498',marginLeft:8}}>{address||'Endereço ainda não informado'}</span></summary>
 <div style={{padding:'0 12px 12px'}}>
 <p style={{fontSize:13,color:'#42618b'}}>{address||'Endereço ainda não informado.'}</p>
 {address&&<div style={{display:'flex',gap:14,marginBottom:12,flexWrap:'wrap'}}><a href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(address)} target="_blank" rel="noopener noreferrer">Google Maps</a><a href={'https://waze.com/ul?q='+encodeURIComponent(address)+'&navigate=yes'} target="_blank" rel="noopener noreferrer">Waze</a></div>}
 <h3 style={{fontSize:14,margin:'12px 0 5px',color:'#173668'}}>Orientações do local <span style={{fontWeight:400,color:'#6b7c98'}}>(opcional)</span></h3>
 {edit?<form onSubmit={e=>{e.preventDefault();void save({action:'infrastructure',access,parking,power,setup})}} style={{display:'grid',gap:9}}>
 <textarea aria-label="Orientações do local" style={{...field,resize:'vertical'}} rows={2} maxLength={4000} placeholder="Ex.: Acesso pelo portão lateral; espaço liberado a partir das 8h." value={setup} onChange={e=>setSetup(e.target.value)}/>
 <button disabled={saving} type="submit" style={{justifySelf:'start',background:'#2058cb',color:'#fff',padding:'9px 15px',border:0,borderRadius:9,fontWeight:700}}>{saving?'Salvando…':'Salvar orientações'}</button>
 </form>:<p style={{whiteSpace:'pre-wrap',fontSize:13}}>{op?.setup_notes||'Nenhuma orientação cadastrada.'}</p>}
 {hint}
 </div></details>
 <details style={{...card,padding:0,overflow:'hidden',background:'linear-gradient(120deg,#e4efff,#f7faff)',border:'1px solid #8db6f6',boxShadow:'0 8px 22px rgba(16,65,147,.13)'}}><summary style={{cursor:'pointer',padding:'9px 12px',listStyle:'none',display:'grid',gap:10,background:'linear-gradient(105deg,#07357f,#0756b8)',color:'#fff'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><strong style={{fontSize:16,color:'#fff'}}>☑ Checklist operacional <span style={{fontSize:11,color:'#c5e3ff'}}>▼</span></strong><span style={{background:'#e7f2ff',color:'#12458e',padding:'5px 10px',borderRadius:99,fontSize:12,fontWeight:800}}>{data.checklist.filter(t=>t.done).length} de {data.checklist.length} concluídas</span></div><div style={{height:7,background:'rgba(255,255,255,.35)',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:(data.checklist.length?100*data.checklist.filter(t=>t.done).length/data.checklist.length:0)+'%',background:'linear-gradient(90deg,#1558c8,#23a4f2)',borderRadius:99,transition:'width .2s'}}/></div></summary><div style={{padding:'10px 12px 12px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,310px),1fr))',gap:10,alignItems:'start'}}>
<section aria-label="Itens do checklist" style={{background:'#e5f0ff',border:'1px solid #a8c8f5',borderRadius:10,padding:10}}>
<strong style={{color:'#0d438e',fontSize:14}}>Itens do checklist</strong>
{data.checklist.length?<ul style={{display:'grid',gap:3,padding:0,margin:'6px 0 0',listStyle:'none'}}>{data.checklist.map(t=><li key={t.id} style={{padding:'6px 8px',borderBottom:'1px solid #c5d9f6',overflowWrap:'anywhere'}}>{edit?<label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}><input type="checkbox" disabled={saving} checked={t.done} onChange={e=>void save({action:'task',taskId:t.id,label:t.label,done:e.target.checked})}/><span style={{fontSize:14,color:'#163f7c'}}>{t.label}</span></label>:<span>{t.done?'✓ ':'○ '}{t.label}</span>}</li>)}</ul>:<p style={{fontSize:13,color:'#526b92'}}>Nenhum item cadastrado.</p>}
</section>
{edit&&<section aria-label="Adicionar item ao checklist" style={{background:'#e5f0ff',border:'1px solid #a8c8f5',borderRadius:10,padding:10,display:'grid',gap:12}}>
<strong style={{color:'#0d438e',fontSize:14}}>Adicionar item</strong>
<form onSubmit={e=>{e.preventDefault();void save({action:'task',label:task,done:false}).then(ok=>{if(ok)setTask('')})}} style={{display:'flex',gap:8,flexWrap:'wrap'}}><input style={{...field,flex:'1 1 180px',minWidth:0}} aria-label="Novo item" placeholder="Ex.: Projetor" maxLength={180} required value={task} onChange={e=>setTask(e.target.value)}/><button disabled={saving} type="submit" style={{background:'linear-gradient(135deg,#2875e7,#073f9b)',color:'#fff',border:0,borderRadius:9,padding:'10px 16px',fontWeight:800}}>＋ Criar</button></form>
<details><summary style={{cursor:'pointer',fontSize:12,color:'#365e98'}}>Modelos reutilizáveis (avançado)</summary><div style={{display:'grid',gap:10,marginTop:12}}><details><summary style={{cursor:'pointer',fontWeight:700}}>Configurações avançadas de modelos</summary><div style={{display:'grid',gap:10,marginTop:12}}>
 <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
 <select aria-label="Modelo de checklist" style={{...field,flex:'1 1 220px'}} value={selectedTemplate} onChange={e=>setSelectedTemplate(e.target.value)}>
 <option value="">Selecione um modelo salvo</option>{templates.map(t=><option key={t.id} value={t.id}>{t.name} ({t.items.length} tarefas)</option>)}
 </select>
 <button type="button" disabled={!selectedTemplate||templateBusy||saving} onClick={()=>void templateAction('apply')} style={{background:'#2058cb',color:'#fff',borderRadius:8,padding:'8px 14px'}}>Aplicar modelo</button>
 <button type="button" disabled={!selectedTemplate||templateBusy||saving} onClick={()=>{const t=templates.find(x=>x.id===selectedTemplate);if(!t)return;setEditingTemplate(t.id);setTemplateName(t.name);setTemplateItems(t.items.join('\n'));}} style={{border:'1px solid #9cb8e6',background:'#e6f0ff',color:'#154a9a',fontWeight:700,borderRadius:8,padding:'8px 14px'}}>Editar</button>
 <button type="button" disabled={!selectedTemplate||templateBusy||saving} onClick={()=>{const t=templates.find(x=>x.id===selectedTemplate);if(t&&window.confirm('Excluir o modelo "'+t.name+'"? As tarefas já aplicadas aos eventos serão mantidas.'))void templateAction('delete')}} style={{border:'1px solid #d39b9b',color:'#9b2626',borderRadius:8,padding:'8px 14px'}}>Excluir</button>
 </div>
 <details open={editingTemplate!==null} key={editingTemplate||'new'}><summary style={{cursor:'pointer',fontWeight:600}}>{editingTemplate?'Editar modelo salvo':'Salvar modelo reutilizável (opcional)'}</summary>
 <form onSubmit={e=>{e.preventDefault();void templateAction('save')}} style={{display:'grid',gap:8,marginTop:10}}>
 <label>Nome do modelo<input style={field} maxLength={120} required placeholder="Ex.: Visita escolar — padrão" value={templateName} onChange={e=>setTemplateName(e.target.value)}/></label>
 <label>Tarefas (uma por linha)<textarea style={field} rows={4} required placeholder={'Ar condicionado\nProjetor'} value={templateItems} onChange={e=>setTemplateItems(e.target.value)}/></label>
 <button type="submit" disabled={templateBusy||saving} style={{justifySelf:'start',background:'#2058cb',color:'#fff',borderRadius:8,padding:'8px 14px'}}>{templateBusy?'Aguarde…':editingTemplate?'Salvar alterações':'Salvar modelo'}</button>{editingTemplate&&<button type="button" onClick={()=>{setEditingTemplate(null);setTemplateName('');setTemplateItems('')}}>Cancelar edição</button>}
 </form></details></div></details></div></details>
</section>}
{hint}</div></details>
 <details style={{...card,padding:0,overflow:'hidden',background:'linear-gradient(145deg,#e6f0ff,#f7faff)',border:'1px solid #91b9fa',boxShadow:'0 10px 26px rgba(21,70,155,.13)'}}><summary style={{cursor:'pointer',padding:'9px 12px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',color:'#fff',background:'linear-gradient(105deg,#07357f,#0756b8)'}}><strong style={{fontSize:16,color:'#fff'}}>🗓 Sessões e turmas <span style={{fontSize:11,color:'#c5e3ff'}}>▼</span></strong><span style={{fontSize:12,fontWeight:700,color:'#12458e',background:'#d8eaff',padding:'7px 13px',borderRadius:99}}>{data.sessions.length} {data.sessions.length===1?'sessão cadastrada':'sessões cadastradas'} · {data.sessions.reduce((sum,s)=>sum+(s.expected_students||0),0)} alunos previstos</span></summary><div style={{padding:'0 12px 12px'}}>{data.sessions.length?<div style={{display:'grid',gap:6,marginBottom:8}}>{data.sessions.map(s=><div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,padding:'7px 10px',border:'1px solid #8fb8f4',borderRadius:12,background:'linear-gradient(110deg,#d9eaff,#c8e0ff)',boxShadow:'0 4px 12px rgba(18,68,116,.13)'}}><strong style={{fontSize:14,color:'#12356d',flex:'1 1 180px'}}>{s.label}</strong><span style={{fontSize:13,fontWeight:650,color:'#24507b'}}>◷ {s.starts_at?String(s.starts_at).slice(0,5):'Horário a definir'}{s.ends_at?' – '+String(s.ends_at).slice(0,5):''}</span><span style={{fontSize:13,fontWeight:700,color:'#174d95'}}>👥 {s.expected_students==null?'Alunos a definir':s.expected_students+' alunos'}</span>{edit&&<button type="button" disabled={saving} onClick={()=>{setEditingSession(s.id);setSession(s.label);setStart(s.starts_at?String(s.starts_at).slice(0,5):'');setEnd(s.ends_at?String(s.ends_at).slice(0,5):'');setStudents(s.expected_students==null?'':String(s.expected_students))}} style={{border:'1px solid #124da9',background:'linear-gradient(135deg,#2875e7,#073f9b)',color:'#fff',borderRadius:8,padding:'6px 12px',fontWeight:700,cursor:'pointer'}}>Editar</button>}{edit&&<button type="button" disabled={saving} onClick={()=>void deleteSession(s)} style={{border:'1px solid #d6a5a5',background:'#fff0f0',color:'#a32b2b',borderRadius:8,padding:'6px 12px',fontWeight:700,cursor:saving?'wait':'pointer'}}>Excluir</button>}</div>)}</div>:<p>Nenhuma sessão cadastrada para este evento.</p>}
 {edit&&<form onSubmit={e=>{e.preventDefault();void save({action:'session',sessionId:editingSession,label:session,start,end,students:students===''?null:Number(students)}).then(ok=>{if(ok){setEditingSession(null);setSession('');setStart('');setEnd('');setStudents('')}})}} style={{display:'grid',gap:8,padding:10,borderRadius:14,border:'1px solid #a6c8fa',background:'linear-gradient(120deg,#f2f7ff,#dbeaff)',boxShadow:'0 5px 16px rgba(18,75,165,.11)'}}><strong style={{fontSize:16,color:'#0a3e8a'}}>{editingSession?'✎ Editar sessão':'✚ Adicionar nova sessão'}</strong><label>Turma ou sessão<input style={field} maxLength={160} placeholder="Ex.: Turma 01 — manhã" required value={session} onChange={e=>setSession(e.target.value)}/></label><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><label>Início<input style={field} type="time" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Fim<input style={field} type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label><label>Alunos previstos<input style={field} type="number" placeholder="Ex.: 30" min="0" max="10000" value={students} onChange={e=>setStudents(e.target.value)}/></label></div><button disabled={saving} type="submit" style={{justifySelf:'start',background:'linear-gradient(135deg,#2875e7,#073f9b)',color:'#fff',border:0,borderRadius:11,padding:'8px 14px',fontWeight:800,fontSize:14,boxShadow:'0 5px 12px rgba(12,68,160,.25)',cursor:saving?'wait':'pointer'}}>＋ {saving?'Salvando…':editingSession?'Salvar alterações':'Adicionar sessão'}</button>{editingSession&&<button type="button" onClick={()=>{setEditingSession(null);setSession('');setStart('');setEnd('');setStudents('')}} style={{justifySelf:'start',padding:'8px 12px',border:'1px solid #8fb8f4',borderRadius:9,color:'#12458e',background:'#d9eaff',fontWeight:700}}>Cancelar edição</button>}</form>}{hint}</div></details>
 </div>;
}
