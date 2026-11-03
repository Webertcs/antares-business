'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './clientes.module.css';
type Client = {id:string;kind:string;name:string;email:string|null;phone:string|null;city:string|null;status:string;notes:string|null;created_at:string};
type Contact = {id:string;client_id:string;full_name:string;position:string|null;email:string|null;phone:string|null;whatsapp:boolean;is_primary:boolean};
type Event = {id:string;client_id:string;title:string;event_kind:string;event_date:string|null;expected_attendees:number|null;pricing_model:string;price_per_person:number|null;fixed_amount:number|null;status:string;venue:string|null;notes:string|null};
const kinds:Record<string,string>={school:'Escola',company:'Empresa',association:'Associação',private:'Particular',other:'Outro'};
const statuses:Record<string,string>={prospect:'Prospecto',active:'Ativo',inactive:'Inativo'};
const eventStatuses:Record<string,string>={lead:'Oportunidade',quoted:'Orçado',reserved:'Reservado',confirmed:'Confirmado',completed:'Realizado',cancelled:'Cancelado'};
const formatDateBR=(value:string|null)=>value?new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(value)):'Sem data';
export default function ClientsPage({ writesEnabled }: { writesEnabled: boolean }) {
 const [clients,setClients]=useState<Client[]>([]);
 const [contacts,setContacts]=useState<Contact[]>([]);
 const [events,setEvents]=useState<Event[]>([]);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [query,setQuery]=useState('');
 const [kind,setKind]=useState('all');
 const restoreDialog=useRef<HTMLDialogElement>(null);
 const [restoreClient,setRestoreClient]=useState<Client|null>(null);
 useEffect(()=>{if(restoreClient)restoreDialog.current?.showModal();},[restoreClient]);
 const [restoreStatus,setRestoreStatus]=useState('prospect');
 const [showArchived,setShowArchived]=useState(false);
 const [selected,setSelected]=useState<string|null>(null);
 const [form,setForm]=useState<'client'|'contact'|'event'|null>(null);
 const formDialog=useRef<HTMLDialogElement>(null);
 const initialFields=useRef<Record<string,string>>({});
 const [editing,setEditing]=useState<string|null>(null);
 const [fields,setFields]=useState<Record<string,string>>({});
 const [feedback,setFeedback]=useState('');
 const [revision,setRevision]=useState(0);
 const [saving,setSaving]=useState(false);
 const dirty=JSON.stringify(fields)!==JSON.stringify(initialFields.current);
 useEffect(()=>{
  if(!form)return;
  formDialog.current?.showModal();
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=previousOverflow;};
 },[form]);
 useEffect(()=>{
  if(!form||(!dirty&&!saving))return;
  const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};
  window.addEventListener('beforeunload',warn);
  return()=>window.removeEventListener('beforeunload',warn);
 },[form,dirty,saving]);
 function closeForm(){
  if(saving)return;
  if(dirty&&!window.confirm('Descartar as alterações não salvas?'))return;
  setForm(null);setFeedback('');
 }
 function openForm(type:'client'|'contact'|'event',client?:Client){
   setFeedback('');setForm(type);setEditing(type==='client'?client?.id||null:null);
   const nextFields:Record<string,string>=type==='client'?{name:client?.name||'',kind:client?.kind||'school',
    email:client?.email||'',phone:client?.phone||'',city:client?.city||'',
    notes:client?.notes||'',status:client?.status||'prospect'}:
    type==='contact'?{name:'',position:'',email:'',phone:''}:
    {title:'',kind:'presentation',date:'',attendees:'',pricing:'per_student',price:'',fixed:'',
      status:'lead',venue:'',notes:''};
   initialFields.current=nextFields;setFields(nextFields);
 }
 const setField=(key:string,value:string)=>setFields(f=>({...f,[key]:value}));
 async function submit(e:React.FormEvent<HTMLFormElement>){
   e.preventDefault();if(!writesEnabled || !form || saving)return;
   const body={...fields,action:form,id:editing,clientId:selected,
     whatsapp:fields.whatsapp==='true',primary:fields.primary==='true'};
   setFeedback('');setSaving(true);
   try {
     const r=await fetch('/api/crm/clientes',{method:'POST',
       headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(body)});
     const data=await r.json();
     if(!r.ok)throw new Error(data.error||'Falha ao salvar');
     setFeedback('Registro salvo com sucesso.');setForm(null);setRevision(n=>n+1);
   } catch(err){setFeedback(err instanceof Error?err.message:'Falha ao salvar');}
   finally {setSaving(false);}
 }
 useEffect(()=>{
   const ctrl=new AbortController();
   fetch('/api/crm/clientes',{cache:'no-store',signal:ctrl.signal})
    .then(async res=>{const d=await res.json();if(!res.ok)throw new Error(d.error||'Não foi possível carregar clientes.');
      setClients(d.clients||[]);setContacts(d.contacts||[]);setEvents(d.events||[]);setError('');
    })
    .catch(e=>{if(e.name!=='AbortError')setError(e instanceof Error?e.message:'Erro de consulta')})
    .finally(()=>setLoading(false));
   return ()=>ctrl.abort();
 },[revision]);
 const filtered=useMemo(()=>clients.filter(c=>(showArchived||c.status!=='inactive')&&(kind==='all'||c.kind===kind)&&
   (c.name+' '+(c.city||'')+' '+(c.email||'')).toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))),[clients,kind,query,showArchived]);
 const active=clients.find(c=>c.id===selected);
 const selectedContacts=contacts.filter(c=>c.client_id===selected);
 const selectedEvents=events.filter(e=>e.client_id===selected);
 async function archiveClient(client:Client,restoreTo?:string){
  if(!writesEnabled||saving)return;
  const archive=client.status!=='inactive';
  if(!archive&&!restoreTo){setFeedback('');setRestoreStatus('prospect');setRestoreClient(client);return;}
  if(archive&&!window.confirm((archive?'Arquivar':'Reativar')+' o cliente '+client.name+'? O histórico, os eventos e as propostas serão preservados.'))return;
  setSaving(true);setFeedback('');
  try{
   const response=await fetch('/api/crm/clientes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    action:'client',id:client.id,kind:client.kind,name:client.name,email:client.email||'',phone:client.phone||'',
    city:client.city||'',notes:client.notes||'',status:archive?'inactive':restoreTo
   })});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Falha ao atualizar cliente');
   setFeedback(archive?'Cliente arquivado; registros e vínculos preservados.':'Cliente reativado.');
   setRestoreClient(null);
   if(archive&&selected===client.id){setSelected(null);setForm(null);}
   setRevision(n=>n+1);
  }catch(e){setFeedback(e instanceof Error?e.message:'Operação indisponível');}
  finally{setSaving(false)}
 }
 const countBy=(k:string)=>clients.filter(c=>c.kind===k).length;
 return <main className={styles.page} style={{maxWidth:1180,margin:'0 auto',padding:'28px 18px',fontFamily:'system-ui'}}>

  <div className={styles.hero} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap',margin:'20px 0'}}>
   <div><p style={{letterSpacing:2,fontSize:12}}>ANTARES · RELACIONAMENTO</p>
    <h1 style={{fontSize:30,fontWeight:750}}>Clientes e Eventos</h1>
    <p>Escolas, empresas, associações e apresentações em um só lugar.</p></div>
   <div className={styles.headerActions}>
   {!writesEnabled&&<span className={styles.access}>Somente consulta</span>}
   <Link href="/vitrine/inbox" className={styles.headerButton}>Solicitações da vitrine</Link>
   <button type="button" className={styles.headerButton} disabled={!writesEnabled||saving} onClick={()=>openForm('client')}>+ Novo cliente</button></div>
  </div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:20}}>
   {[['Clientes cadastrados',clients.length],['Em acompanhamento',clients.filter(c=>c.status!=='inactive').length],['Arquivados',clients.filter(c=>c.status==='inactive').length],['Escolas cadastradas',countBy('school')],['Eventos registrados',events.length]].map(([t,n])=>
    <section className={styles.metric} key={t}><div>{t}</div><strong style={{fontSize:26}}>{n}</strong></section>)}
  </div>
  <section className={styles.directory} style={{border:'1px solid #94a3b8',borderRadius:14,padding:18,marginBottom:20}}>
   <div className={styles.sectionHeading}><div><h2>Base de clientes</h2><p>Encontre cadastros e acompanhe o relacionamento.</p></div><span>{filtered.length} na lista</span></div>
   <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:16}}>
    <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar cliente, cidade ou e-mail"
     aria-label="Buscar clientes" style={{padding:12,borderRadius:9,border:'1px solid #94a3b8',flex:'1 1 250px',color:'#111',background:'#fff'}}/>
    <select value={kind} onChange={e=>setKind(e.target.value)} aria-label="Tipo de cliente"
     style={{padding:12,borderRadius:9,color:'#111',background:'#fff'}}>
     <option value="all">Todos os clientes</option>
     {Object.entries(kinds).map(([key,val])=><option key={key} value={key}>{val}</option>)}
    </select>
    <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,whiteSpace:'nowrap'}}><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/> Mostrar arquivados</label>
   </div>
   {loading?<p>Carregando clientes...</p>:error?<p role="alert">{error}</p>:
    filtered.length===0?<div className={styles.empty}><h3>Nenhum cliente nesta visualização</h3><p>{clients.length===0?(writesEnabled?'Cadastre o primeiro cliente para começar.':'Nenhum cadastro disponível para consulta.'):query||kind!=='all'?'Tente outro nome, cidade ou tipo de cliente.':'Marque Mostrar arquivados para consultar os cadastros guardados.'}</p></div>:
    <div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left',borderCollapse:'collapse'}}>
    <thead><tr>{['Cliente','Tipo','Cidade','Situação','Detalhes'].map(x=><th key={x} style={{padding:'12px 8px',borderBottom:'1px solid #94a3b8'}}>{x}</th>)}</tr></thead>
    <tbody>{filtered.map(c=><tr key={c.id}><td style={{padding:10,borderBottom:'1px solid #94a3b8'}}><strong>{c.name}</strong></td>
    <td>{kinds[c.kind]||c.kind}</td><td>{c.city||'—'}</td><td><span className={styles.badge} data-status={c.status}>{c.status==='inactive'?'Arquivado':statuses[c.status]||c.status}</span></td>
    <td><div className={styles.actions}><button disabled={saving} onClick={()=>setSelected(c.id===selected?null:c.id)} style={{padding:8,borderRadius:8,background:'#2563eb',color:'white'}} >{c.id===selected?'Fechar':'Ver histórico'}</button> {writesEnabled&&<><button disabled={saving} onClick={()=>openForm('client',c)}>Editar</button> <button type="button" disabled={saving} onClick={()=>archiveClient(c)} style={{padding:8,borderRadius:8,border:'1px solid #a9bddc',background:'#eef4ff',color:'#234d89'}}>{c.status==='inactive'?'Reativar':'Arquivar'}</button></>}</div></td></tr>)}</tbody></table></div>}
  </section>
  {active&&<section className={styles.history} style={{border:'1px solid #94a3b8',borderRadius:14,padding:20}}>
   <h2 style={{fontSize:23,fontWeight:700}}>{active.name}</h2>
   <p>{kinds[active.kind]} · {active.city||'Cidade não informada'} · {statuses[active.status]||active.status}</p>
   <p>{active.email||'Sem e-mail'} · {active.phone||'Sem telefone'}</p>
   {active.notes&&<p>Observações: {active.notes}</p>}
   <h3 style={{fontSize:18,marginTop:20}}>Contatos ({selectedContacts.length}) {writesEnabled&&<button onClick={()=>openForm('contact')}>+ Contato</button>}</h3>
   {selectedContacts.length===0?<p>Sem contatos cadastrados.</p>:
    <ul>{selectedContacts.map(c=><li key={c.id}>{c.full_name}{c.position?' · '+c.position:''}
     {c.is_primary?' · Principal':''} · {c.phone||c.email||'Sem contato'}</li>)}</ul>}
   <h3 style={{fontSize:18,marginTop:20}}>Apresentações e oportunidades ({selectedEvents.length}) {writesEnabled&&<button onClick={()=>openForm('event')}>+ Evento</button>}</h3>
   {selectedEvents.length===0?<p>Sem eventos registrados.</p>:
    <ul>{selectedEvents.map(e=><li key={e.id}>{e.title} · {formatDateBR(e.event_date)} · {eventStatuses[e.status]||e.status}
    {e.expected_attendees!=null?' · '+e.expected_attendees+' participantes':''}</li>)}</ul>}
  </section>}
  {feedback&&!form&&<p className={styles.feedback} role="status">{feedback}</p>}
  {form&&<dialog ref={formDialog} aria-labelledby="client-form-title" aria-modal="true" className={`${styles.editor} ${styles.formDialog}`} onCancel={e=>{e.preventDefault();closeForm();}}>
   <div className={styles.formHeading}>
   <h2 id="client-form-title" style={{fontSize:22}}>{form==='client'?(editing?'Editar cliente':'Novo cliente'):form==='contact'?'Novo contato':'Nova apresentação'}</h2>
   <button type="button" disabled={saving} onClick={closeForm} aria-label="Fechar formulário">×</button></div>
   <form onSubmit={submit} style={{display:'grid',gap:12}}>
    <fieldset disabled={saving} className={styles.formFields}>
    {(form==='client'?[
      ['name','Nome'],['kind','Tipo'],['email','E-mail'],['phone','Telefone'],['city','Cidade'],['status','Situação'],['notes','Observações']
    ]:form==='contact'?[
      ['name','Nome'],['position','Cargo/Função'],['email','E-mail'],['phone','Telefone'],['whatsapp','WhatsApp'],['primary','Contato principal']
    ]:[
      ['title','Título'],['kind','Tipo de evento'],['date','Data'],['attendees','Participantes'],
      ['pricing','Cobrança'],['price','Valor por participante'],['fixed','Valor fechado'],
      ['status','Situação'],['venue','Local'],['notes','Observações']
    ]).map(([key,label])=><label key={key}>{label}
      {(key==='kind'||key==='status'||key==='pricing'||key==='whatsapp'||key==='primary')?
       <select value={fields[key]||''} onChange={e=>setField(key,e.target.value)} style={{display:'block',padding:10,width:'100%'}}>
        {(key==='kind'?(form==='client'?Object.entries(kinds):
         [['presentation','Apresentação'],['corporate','Corporativo'],['private','Particular'],['other','Outro']]):
         key==='status'?(form==='client'?Object.entries(statuses):Object.entries(eventStatuses)):
         key==='pricing'?[['per_student','Por participante'],['fixed','Valor fechado'],['complimentary','Gratuito']]:
         [['false','Não'],['true','Sim']]).map(([v,l])=><option key={v} value={v}>{l}</option>)}
       </select>:
       <input autoFocus={key==='name'||key==='title'} value={fields[key]||''} onChange={e=>setField(key,e.target.value)}
        type={key==='date'?'date':key==='email'?'email':key==='attendees'||key==='price'||key==='fixed'?'number':'text'}
        step={key==='price'||key==='fixed'?'0.01':undefined}
        required={key==='name'||key==='title'}
        style={{display:'block',padding:10,width:'100%',color:'#111',background:'#fff'}}/>}</label>)}
    </fieldset>
    {feedback&&<p className={styles.formError} role="alert">{feedback}</p>}
    <div className={styles.formActions}><button type="submit" disabled={!writesEnabled||saving}>{saving?"Salvando...":"Salvar"}</button>
    <button type="button" disabled={saving} onClick={closeForm} style={{marginLeft:12}}>Cancelar</button></div>
   </form></dialog>}
  {restoreClient&&<dialog ref={restoreDialog} onCancel={e=>{if(saving)e.preventDefault();else setRestoreClient(null);}} aria-labelledby="restore-title" className={styles.dialog}>
   <h2 id="restore-title">Reativar {restoreClient.name}</h2>
   <p>Escolha a situação comercial do cliente. O histórico e os vínculos serão mantidos.</p>
   <label>Situação ao reativar<select autoFocus value={restoreStatus} disabled={saving} onChange={e=>setRestoreStatus(e.target.value)}><option value="prospect">Prospecto</option><option value="active">Ativo</option></select></label>
   <p className={styles.caption}>A situação anterior ao arquivamento não foi armazenada.</p>
   <div className={styles.actions}><button disabled={saving} onClick={()=>archiveClient(restoreClient,restoreStatus)}>{saving?'Reativando...':'Confirmar reativação'}</button><button disabled={saving} onClick={()=>setRestoreClient(null)}>Cancelar</button></div>
   {feedback&&<p role="status">{feedback}</p>}
  </dialog>}
 </main>;
}
