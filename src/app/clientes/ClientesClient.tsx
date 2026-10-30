'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
 const [selected,setSelected]=useState<string|null>(null);
 const [form,setForm]=useState<'client'|'contact'|'event'|null>(null);
 const [editing,setEditing]=useState<string|null>(null);
 const [fields,setFields]=useState<Record<string,string>>({});
 const [feedback,setFeedback]=useState('');
 const [revision,setRevision]=useState(0);
 const [saving,setSaving]=useState(false);
 function openForm(type:'client'|'contact'|'event',client?:Client){
   setForm(type);setEditing(type==='client'?client?.id||null:null);
   setFields(type==='client'?{name:client?.name||'',kind:client?.kind||'school',
    email:client?.email||'',phone:client?.phone||'',city:client?.city||'',
    notes:client?.notes||'',status:client?.status||'prospect'}:
    type==='contact'?{name:'',position:'',email:'',phone:''}:
    {title:'',kind:'presentation',date:'',attendees:'',pricing:'per_student',price:'',fixed:'',
      status:'lead',venue:'',notes:''});
 }
 const setField=(key:string,value:string)=>setFields(f=>({...f,[key]:value}));
 async function submit(e:React.FormEvent<HTMLFormElement>){
   e.preventDefault();if(!writesEnabled || !form)return;
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
 const filtered=useMemo(()=>clients.filter(c=>(kind==='all'||c.kind===kind)&&
   (c.name+' '+(c.city||'')+' '+(c.email||'')).toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))),[clients,kind,query]);
 const active=clients.find(c=>c.id===selected);
 const selectedContacts=contacts.filter(c=>c.client_id===selected);
 const selectedEvents=events.filter(e=>e.client_id===selected);
 const countBy=(k:string)=>clients.filter(c=>c.kind===k).length;
 return <main style={{maxWidth:1180,margin:'0 auto',padding:'28px 18px',fontFamily:'system-ui'}}>
  <Link href="/">← Voltar ao painel</Link>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap',margin:'20px 0'}}>
   <div><p style={{letterSpacing:2,fontSize:12}}>ANTARES BUSINESS · BLOCO 03</p>
    <h1 style={{fontSize:30,fontWeight:750}}>Clientes e Eventos</h1>
    <p>Escolas, empresas, associações e apresentações em um só lugar.</p></div>
   <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
   <span style={{border:'1px solid #eab308',padding:'8px 12px',borderRadius:10}}>{writesEnabled?"Cadastros liberados":"Cadastros em homologação"}</span>
   <button type="button" disabled={!writesEnabled} onClick={()=>openForm('client')} style={{padding:12,borderRadius:9,background:'#2563eb',color:'#fff',opacity:writesEnabled?1:.5}}>+ Novo cliente</button></div>
  </div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:20}}>
   {[['Clientes',clients.length],['Escolas',countBy('school')],['Empresas',countBy('company')],['Associações',countBy('association')],['Eventos',events.length]].map(([t,n])=>
    <section key={t} style={{border:'1px solid #94a3b8',padding:18,borderRadius:14}}><div>{t}</div><strong style={{fontSize:26}}>{n}</strong></section>)}
  </div>
  <section style={{border:'1px solid #94a3b8',borderRadius:14,padding:18,marginBottom:20}}>
   <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:16}}>
    <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar cliente, cidade ou e-mail"
     aria-label="Buscar clientes" style={{padding:12,borderRadius:9,border:'1px solid #94a3b8',flex:'1 1 250px',color:'#111',background:'#fff'}}/>
    <select value={kind} onChange={e=>setKind(e.target.value)} aria-label="Tipo de cliente"
     style={{padding:12,borderRadius:9,color:'#111',background:'#fff'}}>
     <option value="all">Todos os clientes</option>
     {Object.entries(kinds).map(([key,val])=><option key={key} value={key}>{val}</option>)}
    </select>
   </div>
   {loading?<p>Carregando clientes...</p>:error?<p role="alert">{error}</p>:
    filtered.length===0?<p>Nenhum cliente encontrado. A inclusão será liberada após a homologação de segurança.</p>:
    <div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left',borderCollapse:'collapse'}}>
    <thead><tr>{['Cliente','Tipo','Cidade','Situação','Detalhes'].map(x=><th key={x} style={{padding:'12px 8px',borderBottom:'1px solid #94a3b8'}}>{x}</th>)}</tr></thead>
    <tbody>{filtered.map(c=><tr key={c.id}><td style={{padding:10,borderBottom:'1px solid #94a3b8'}}><strong>{c.name}</strong></td>
    <td>{kinds[c.kind]||c.kind}</td><td>{c.city||'—'}</td><td>{statuses[c.status]||c.status}</td>
    <td><button onClick={()=>setSelected(c.id===selected?null:c.id)} style={{padding:8,borderRadius:8,background:'#2563eb',color:'white'}} >{c.id===selected?'Fechar':'Ver histórico'}</button> {writesEnabled&&<button onClick={()=>openForm('client',c)}>Editar</button>}</td></tr>)}</tbody></table></div>}
  </section>
  {active&&<section style={{border:'1px solid #94a3b8',borderRadius:14,padding:20}}>
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
  {feedback&&<p role="status">{feedback}</p>}
  {form&&<section style={{border:'1px solid #94a3b8',borderRadius:14,padding:20,marginTop:20}}>
   <h2 style={{fontSize:22}}>{form==='client'?(editing?'Editar cliente':'Novo cliente'):form==='contact'?'Novo contato':'Nova apresentação'}</h2>
   <form onSubmit={submit} style={{display:'grid',gap:12}}>
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
       <input value={fields[key]||''} onChange={e=>setField(key,e.target.value)}
        type={key==='date'?'date':key==='email'?'email':key==='attendees'||key==='price'||key==='fixed'?'number':'text'}
        step={key==='price'||key==='fixed'?'0.01':undefined}
        required={key==='name'||key==='title'}
        style={{display:'block',padding:10,width:'100%',color:'#111',background:'#fff'}}/>}</label>)}
    <div><button type="submit" disabled={!writesEnabled||saving}>{saving?"Salvando...":"Salvar"}</button>
    <button type="button" onClick={()=>setForm(null)} style={{marginLeft:12}}>Cancelar</button></div>
   </form></section>}
  <p style={{marginTop:20,fontSize:13,opacity:.8}}>Dados restritos à organização autenticada. {writesEnabled?"Apenas o proprietário pode cadastrar e alterar registros.":"Gravações bloqueadas até a homologação de segurança."}</p>
 </main>;
}
