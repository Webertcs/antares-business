'use client';
import {useCallback,useEffect,useState} from 'react';
type Operation={access_instructions:string|null;parking_instructions:string|null;power_requirements:string|null;setup_notes:string|null};
type Task={id:string;label:string;done:boolean;completed_at:string|null};
type Session={id:string;label:string;starts_at:string|null;ends_at:string|null;expected_students:number|null};
type Template={id:string;name:string;items:string[]};
type Payload={available:boolean;canEdit:boolean;operations:Operation|null;checklist:Task[];sessions:Session[]};
const card:React.CSSProperties={background:'#f3f7ff',border:'1px solid #c9d9f5',borderRadius:12,padding:12};
const field:React.CSSProperties={width:'100%',padding:'8px 10px',fontSize:14,border:'1px solid #819fcf',borderRadius:8,background:'#fff',color:'#173a70'};
export default function EventOperations({eventId}:{eventId:string}){
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
 async function deleteTask(t:Task){
  if(!data?.canEdit||saving)return;
  if(!window.confirm('Excluir o item "'+t.label+'" deste evento? Esta ação não pode ser desfeita.'))return;
  setSaving(true);setMessage('');setFeedbackKind(null);
  try{
   const res=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/operacao/salvar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete_task',taskId:t.id})});
   const json=await res.json();if(!res.ok)throw Error(json.error||'Não foi possível excluir o item.');
   setData(await load());setFeedbackKind('success');setMessage('Item excluído deste evento.');
  }catch(e){setFeedbackKind('error');setMessage(e instanceof Error?e.message:'Falha ao excluir item')}
  finally{setSaving(false)}
 }
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
 const hint=!edit?<p style={{fontSize:14,color:'#344e74'}}>Edição indisponível até a liberação segura no Neon.</p>:null;
 return <div style={{display:'grid',gap:9,fontSize:14,lineHeight:1.5}}>
 {message&&<p role={feedbackKind==='error'?'alert':'status'} aria-live="polite" style={{position:'sticky',top:12,zIndex:3,padding:'12px 16px',borderRadius:10,fontWeight:700,background:feedbackKind==='error'?'#fff0ef':'#e6f7ed',color:feedbackKind==='error'?'#9b2626':'#14633b',border:'1px solid '+(feedbackKind==='error'?'#efb3b3':'#9dd7b4')}}>{feedbackKind==='success'?'✓ ':'⚠ '}{message}</p>}
 <details open style={{...card,padding:0,overflow:'hidden',background:'linear-gradient(120deg,#e4efff,#f7faff)',border:'1px solid #8db6f6',boxShadow:'0 8px 22px rgba(16,65,147,.13)'}}><summary style={{cursor:'pointer',padding:'7px 10px',listStyle:'none',display:'grid',gap:10,background:'linear-gradient(105deg,#07357f,#0756b8)',color:'#fff'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><strong style={{fontSize:14,color:'#fff'}}>☑ Checklist operacional <span style={{fontSize:10,color:'#c5e3ff'}}>▼</span></strong><span style={{background:'#e7f2ff',color:'#12458e',padding:'5px 10px',borderRadius:99,fontSize:12,fontWeight:400}}>{data.checklist.filter(t=>t.done).length} de {data.checklist.length} concluídas</span></div><div style={{height:7,background:'rgba(255,255,255,.35)',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:(data.checklist.length?100*data.checklist.filter(t=>t.done).length/data.checklist.length:0)+'%',background:'linear-gradient(90deg,#1558c8,#23a4f2)',borderRadius:99,transition:'width .2s'}}/></div></summary><div style={{padding:'10px 12px 12px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,310px),1fr))',gap:10,alignItems:'start'}}>
<section aria-label="Itens do checklist" style={{background:'#e5f0ff',border:'1px solid #a8c8f5',borderRadius:10,padding:8}}>
<strong style={{color:'#0d438e',fontSize:13}}>Itens do checklist</strong>
{data.checklist.length?<ul style={{display:'grid',gap:3,padding:0,margin:'6px 0 0',listStyle:'none'}}>{data.checklist.map(t=><li key={t.id} style={{padding:'4px 6px',borderBottom:'1px solid #c5d9f6',overflowWrap:'anywhere',display:'flex',alignItems:'center',gap:6}}>{edit?<label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',flex:1,minWidth:0}}><input type="checkbox" disabled={saving} checked={t.done} onChange={e=>void save({action:'task',taskId:t.id,label:t.label,done:e.target.checked})}/><span style={{fontSize:13,color:'#163f7c'}}>{t.label}</span></label>:<span>{t.done?'✓ ':'○ '}{t.label}</span>}{edit&&<button type="button" aria-label={'Excluir item '+t.label} title={'Excluir '+t.label} disabled={saving} onClick={()=>void deleteTask(t)} style={{marginLeft:'auto',padding:'7px 9px',fontSize:12,minHeight:32,color:'#a32b2b',background:'#fff2f2',border:'1px solid #e5b9b9',borderRadius:6,cursor:'pointer'}}>Excluir</button>}</li>)}</ul>:<p style={{fontSize:13,color:'#35577f'}}>Nenhum item cadastrado.</p>}
</section>
{edit&&<section aria-label="Adicionar item ao checklist" style={{background:'#e5f0ff',border:'1px solid #a8c8f5',borderRadius:10,padding:8,display:'grid',gap:12}}>
<strong style={{color:'#0d438e',fontSize:13}}>Adicionar item</strong>
<form onSubmit={e=>{e.preventDefault();void save({action:'task',label:task,done:false}).then(ok=>{if(ok)setTask('')})}} style={{display:'flex',gap:8,flexWrap:'wrap'}}><input style={{...field,flex:'1 1 180px',minWidth:0}} aria-label="Novo item" placeholder="Ex.: Projetor" maxLength={180} required value={task} onChange={e=>setTask(e.target.value)}/><button disabled={saving} type="submit" style={{background:'linear-gradient(135deg,#2875e7,#073f9b)',color:'#fff',border:0,borderRadius:9,padding:'5px 9px',fontSize:14,fontWeight:800,minHeight:36}}>＋ Criar</button></form>
<details style={{marginTop:12,padding:'9px 10px',border:'1px solid #b5cdf2',borderRadius:9,background:'#eaf2ff'}}><summary style={{cursor:'pointer',fontSize:14,fontWeight:800,color:'#164687'}}>Modelos de checklist</summary><div style={{display:'grid',gap:8,marginTop:9}}><span style={{fontSize:14,color:'#304d77'}}>Escolha um modelo salvo para aplicar, editar ou excluir.</span>
 <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
 <select aria-label="Modelo de checklist" style={{...field,flex:'1 1 220px'}} value={selectedTemplate} onChange={e=>setSelectedTemplate(e.target.value)}>
 <option value="">Selecione um modelo salvo</option>{templates.map(t=><option key={t.id} value={t.id}>{t.name} ({t.items.length} tarefas)</option>)}
 </select>
 <button type="button" disabled={!selectedTemplate||templateBusy||saving} onClick={()=>void templateAction('apply')} style={{background:'#2058cb',color:'#fff',borderRadius:8,padding:'5px 10px'}}>Aplicar modelo</button>
 <button type="button" disabled={!selectedTemplate||templateBusy||saving} onClick={()=>{const t=templates.find(x=>x.id===selectedTemplate);if(!t)return;setEditingTemplate(t.id);setTemplateName(t.name);setTemplateItems(t.items.join('\n'));}} style={{border:'1px solid #9cb8e6',background:'#e6f0ff',color:'#154a9a',fontWeight:700,borderRadius:8,padding:'5px 10px'}}>Editar</button>
 <button type="button" disabled={!selectedTemplate||templateBusy||saving} onClick={()=>{const t=templates.find(x=>x.id===selectedTemplate);if(t&&window.confirm('Excluir o modelo "'+t.name+'"? As tarefas já aplicadas aos eventos serão mantidas.'))void templateAction('delete')}} style={{border:'1px solid #d39b9b',color:'#9b2626',borderRadius:8,padding:'5px 10px'}}>Excluir</button>
 </div>
 <details open={editingTemplate!==null} key={editingTemplate||'new'}><summary style={{cursor:'pointer',fontWeight:600,fontSize:11,color:'#154a9a'}}>{editingTemplate?'Editar modelo salvo':'+ Criar novo modelo'}</summary>
 <form onSubmit={e=>{e.preventDefault();void templateAction('save')}} style={{display:'grid',gap:8,marginTop:10}}>
 <label>Nome do modelo<input style={field} maxLength={120} required placeholder="Ex.: Visita escolar — padrão" value={templateName} onChange={e=>setTemplateName(e.target.value)}/></label>
 <label>Tarefas (uma por linha)<textarea style={field} rows={4} required placeholder={'Ar condicionado\nProjetor'} value={templateItems} onChange={e=>setTemplateItems(e.target.value)}/></label>
 <button type="submit" disabled={templateBusy||saving} style={{justifySelf:'start',background:'#2058cb',color:'#fff',borderRadius:8,padding:'5px 10px'}}>{templateBusy?'Aguarde…':editingTemplate?'Salvar alterações':'Salvar modelo'}</button>{editingTemplate&&<button type="button" onClick={()=>{setEditingTemplate(null);setTemplateName('');setTemplateItems('')}}>Cancelar edição</button>}
 </form></details></div></details>
</section>}
{hint}</div></details>

 </div>;
}
