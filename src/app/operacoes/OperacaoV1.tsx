'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
type RecordRow=Record<string,unknown>;
type State={clients:RecordRow[];proposals:RecordRow[];contracts:RecordRow[];domes:RecordRow[];bookings:RecordRow[];ledger:RecordRow[];audit:RecordRow[]};
const empty:State={clients:[],proposals:[],contracts:[],domes:[],bookings:[],ledger:[],audit:[]};
const money=(value:unknown)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value)||0);
const date=(value:unknown)=>{if(!value)return '—';const raw=String(value);const day=/^\d{4}-\d{2}-\d{2}$/.test(raw)?new Date(raw+'T12:00:00Z'):new Date(raw);return Number.isNaN(day.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeZone:'America/Sao_Paulo'}).format(day);};
const dateTime=(value:unknown)=>{if(!value)return '—';const d=new Date(String(value));return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(d);};
const localDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export default function OperacaoV1({writesEnabled}:{writesEnabled:boolean}){
 const [data,setData]=useState<State>(empty),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const [tab,setTab]=useState<'comercial'|'contratos'|'agenda'|'financeiro'|'auditoria'>('comercial');
 const [term,setTerm]=useState('');
 const [dataEvents,setDataEvents]=useState<RecordRow[]>([]);
 const [eventError,setEventError]=useState('');
 const [revision,setRevision]=useState(0);
 const [form,setForm]=useState<'proposal'|'contract'|'dome'|'booking'|'ledger'|null>(null);
 const [fields,setFields]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(false);
 const [feedback,setFeedback]=useState('');
 function openForm(type:'proposal'|'contract'|'dome'|'booking'|'ledger'){
  setForm(type);setFeedback('');
  setFields(type==='proposal'?{clientId:'',title:'',model:'per_student',attendees:'30',
    unitPrice:'10',fixedPrice:'0',discount:'0',deposit:'0',validUntil:'',notes:''}:
    type==='contract'?{proposalId:'',mode:'written',terms:''}:type==='dome'?{name:''}:type==='booking'?{eventId:'',domeId:'',start:'',end:''}:{description:'',amount:'',date:localDay(),category:'income',status:'planned'});
 }
 function field(k:string,v:string){setFields(old=>({...old,[k]:v}));}
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!writesEnabled||!form||busy)return;
  const n=(k:string)=>Number(fields[k]||0);
  setBusy(true);setFeedback('');
  try{
   if(form==='ledger' && (!Number.isFinite(Number(fields.amount)) || Number(fields.amount)<=0 || !fields.date))
     throw new Error('Informe uma data e um valor maior que zero.');
   if(form==='booking' && (!fields.start || !fields.end ||
     !Number.isFinite(Date.parse(fields.start)) || !Number.isFinite(Date.parse(fields.end)) ||
     Date.parse(fields.end)<=Date.parse(fields.start)))
     throw new Error('Confira início e término da reserva.');
   const body=form==='proposal'?{action:'proposal',...fields,
    attendees:n('attendees'),unitPrice:n('unitPrice'),fixedPrice:n('fixedPrice'),
    discount:n('discount'),deposit:n('deposit')}:form==='ledger'?{action:'ledger',...fields,amount:n('amount')}:form==='booking'?{action:'booking',...fields,start:new Date(fields.start).toISOString(),end:new Date(fields.end).toISOString()}:{action:form,...fields};
   const response=await fetch('/api/business/gravar',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Não foi possível salvar');
   setForm(null);setRevision(v=>v+1);setFeedback('Registro comercial salvo com sucesso.');
  }catch(e){setFeedback(e instanceof Error?e.message:'Erro ao salvar');}
  finally{setBusy(false);}
 }
 useEffect(()=>{const ctrl=new AbortController();
  fetch('/api/business',{cache:'no-store',signal:ctrl.signal}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error||'Falha na consulta');setData(b);setError('');})
  .catch(e=>{if(e.name!=='AbortError')setError(e instanceof Error?e.message:'Consulta indisponível');})
  .finally(()=>setLoading(false));return()=>ctrl.abort();
 },[revision]);
 useEffect(()=>{const controller=new AbortController();
  fetch('/api/crm/clientes',{cache:'no-store',signal:controller.signal})
   .then(async r=>{if(!r.ok)throw Error('Não foi possível consultar apresentações.');return r.json();})
   .then(d=>{setDataEvents(Array.isArray(d.events)?d.events:[]);setEventError('');})
   .catch(e=>{if(e?.name!=='AbortError')setEventError('Apresentações indisponíveis; confira o CRM.');});
  return()=>controller.abort();
 },[revision]);
 const filtered=useMemo(()=>data.proposals.filter(x=>String(x.title||'').toLowerCase().includes(term.toLowerCase())||String(x.client_name||'').toLowerCase().includes(term.toLowerCase())),[data.proposals,term]);
 const forecast=data.proposals.filter(p=>['accepted','sent','negotiating'].includes(String(p.status))).reduce((sum,p)=>sum+Number(p.total||0),0);
 const cash=data.ledger.filter(x=>x.status==='settled').reduce((sum,x)=>sum+(x.category==='income'?1:-1)*Number(x.amount||0),0);
 const pending=data.ledger.filter(x=>x.status==='planned').reduce((sum,x)=>sum+(x.category==='income'?1:-1)*Number(x.amount||0),0);
 const base:React.CSSProperties={border:'1px solid #cbd5e1',borderRadius:14,padding:18,background:'#f8fafc'};
 return <main style={{maxWidth:1250,margin:'0 auto',padding:'28px 18px',fontFamily:'system-ui',color:'#0f172a'}}>
 <Link href="/">← Painel</Link>
 <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
 <div><p style={{fontSize:12,letterSpacing:2,marginBottom:6}}>ANTARES BUSINESS · V1</p><h1 style={{fontSize:30,fontWeight:750}}>Central de Operações</h1>
 <p>Comercial, contratos, cúpulas, caixa e auditoria em uma visão única.</p></div>
 <Link href="/clientes" style={{background:'#2563eb',color:'white',padding:12,borderRadius:9,textDecoration:'none'}}>Abrir cadastro de clientes</Link></div>
 {loading&&<p role="status">Carregando informações do planetário...</p>}
 {error&&<div role="alert" style={{...base,borderColor:'#b45309',marginTop:20}}>O núcleo da V1 ainda não foi implantado no Neon. {error} As gravações deste módulo permanecem bloqueadas.</div>}
 {!loading&&!error&&<>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:12,margin:'20px 0'}}>
  {([['Clientes',data.clients.length],['Propostas',data.proposals.length],['Valor proposto',money(forecast)],['Saldo realizado',money(cash)],['Fluxo previsto',money(pending)],['Reservas',data.bookings.length]] as [string,string|number][]).map(([t,v])=><div key={t} style={base}><small>{t}</small><div style={{fontSize:25,fontWeight:750}}>{v}</div></div>)}
 </div>
 <nav aria-label="Áreas operacionais" style={{display:'flex',gap:8,flexWrap:'wrap',margin:'16px 0'}}>
 {([['comercial','Propostas'],['contratos','Contratos'],['agenda','Agenda e cúpulas'],['financeiro','Financeiro'],['auditoria','Auditoria']] as const).map(([k,l])=>
 <button key={k} onClick={()=>setTab(k)} aria-current={tab===k?'page':undefined}
 style={{padding:'10px 15px',borderRadius:10,background:tab===k?'#1d4ed8':'#e2e8f0',color:tab===k?'#fff':'#0f172a'}}>{l}</button>)}</nav>
 {tab==='comercial'&&<section style={base}><h2 style={{fontSize:21,fontWeight:650}}>Propostas e orçamentos</h2>{writesEnabled&&<button onClick={()=>openForm('proposal')} style={{padding:10,background:'#2563eb',color:'#fff',borderRadius:8}}>+ Nova proposta</button>}<p>Valores previstos, negociação e condições comerciais por cliente.</p>
  <input aria-label="Pesquisar proposta" placeholder="Pesquisar proposta ou cliente" value={term} onChange={e=>setTerm(e.target.value)} style={{padding:11,border:'1px solid #94a3b8',borderRadius:8,width:'100%',margin:'10px 0'}}/>
  <Rows heads={['Proposta','Cliente','Total','Situação','Validade']}
   rows={filtered.map(p=>[p.title,p.client_name,money(p.total),p.status,date(p.valid_until)])}/></section>}
 {tab==='contratos'&&<section style={base}><h2 style={{fontSize:21,fontWeight:650}}>Contratos e confirmações</h2>{writesEnabled&&<button onClick={()=>openForm('contract')} style={{padding:10,background:'#2563eb',color:'#fff',borderRadius:8}}>+ Novo contrato</button>}
  <p>Confirmação documental, verbal ou pelo WhatsApp, vinculada à proposta.</p>
  <Rows heads={['Proposta','Modalidade','Situação','Confirmação']}
  rows={data.contracts.map(c=>[c.proposal_title,c.confirmation_mode,c.status,dateTime(c.confirmed_at)])}/></section>}
 {tab==='agenda'&&<section style={base}><h2 style={{fontSize:21,fontWeight:650}}>Cúpulas e apresentações</h2>{writesEnabled&&<div style={{display:'flex',gap:8}}><button onClick={()=>openForm('dome')}>+ Cúpula</button><button onClick={()=>openForm('booking')}>+ Reserva</button></div>}
  <p>Equipamentos cadastrados: {data.domes.map(d=>String(d.name)).join(' · ')||'nenhum'}.</p>{eventError&&<p role="alert">{eventError}</p>}
  <Rows heads={['Apresentação','Cúpula','Início','Término','Situação']}
  rows={data.bookings.map(b=>[b.event_title,b.dome_name,dateTime(b.starts_at),dateTime(b.ends_at),b.status])}/></section>}
 {tab==='financeiro'&&<section style={base}><h2 style={{fontSize:21,fontWeight:650}}>Extrato operacional</h2>{writesEnabled&&<button onClick={()=>openForm('ledger')}>+ Lançamento</button>}
  <p>Somente lançamentos liquidados compõem o saldo. Previsto não é recebido.</p>
  <Rows heads={['Data','Descrição','Tipo','Valor','Situação']}
   rows={data.ledger.map(x=>[date(x.occurred_on),x.description,x.category,money(x.amount),x.status])}/></section>}
 {tab==='auditoria'&&<section style={base}><h2 style={{fontSize:21,fontWeight:650}}>Trilha de auditoria</h2>
  <p>Registros de alterações, disponíveis para conferência do proprietário.</p>
  <Rows heads={['Quando','Ação','Entidade','ID']}
  rows={data.audit.map(x=>[dateTime(x.created_at),x.action,x.entity_type,x.entity_id])}/></section>}
 </>}
 {feedback&&<p role="status" style={{marginTop:12}}>{feedback}</p>}
 {form&&<section style={{...base,marginTop:18}}>
  <h2 style={{fontWeight:700,fontSize:21}}>{({proposal:'Nova proposta comercial',contract:'Novo contrato',dome:'Nova cúpula',booking:'Nova reserva',ledger:'Novo lançamento financeiro'} as Record<string,string>)[form]}</h2>
  <form onSubmit={submit} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginTop:14}}>
   {form==='proposal'?<>
    <Field label="Cliente" field="clientId" value={fields.clientId} onChange={field} options={data.clients.map(c=>({value:String(c.id),label:String(c.name)}))}/>
    <Field label="Título" field="title" value={fields.title} onChange={field} required/>
    <Field label="Cobrança" field="model" value={fields.model} onChange={field} options={[
     {value:'per_student',label:'Por aluno'},{value:'fixed',label:'Valor fechado'},
     {value:'complimentary',label:'Gratuito'}]}/>
    <Field label="Participantes" field="attendees" value={fields.attendees} onChange={field} type="number"/>
    <Field label="Preço por aluno (R$)" field="unitPrice" value={fields.unitPrice} onChange={field} type="number"/>
    <Field label="Preço fechado (R$)" field="fixedPrice" value={fields.fixedPrice} onChange={field} type="number"/>
    <Field label="Desconto (R$)" field="discount" value={fields.discount} onChange={field} type="number"/>
    <Field label="Sinal (R$)" field="deposit" value={fields.deposit} onChange={field} type="number"/>
    <Field label="Validade" field="validUntil" value={fields.validUntil} onChange={field} type="date"/>
    <Field label="Observações" field="notes" value={fields.notes} onChange={field}/>
    <div style={{gridColumn:'1/-1'}}>Total estimado: <strong>{money(Math.max(0,
      (fields.model==='per_student'?Number(fields.attendees||0)*Number(fields.unitPrice||0):
       fields.model==='fixed'?Number(fields.fixedPrice||0):0)-Number(fields.discount||0)))}</strong></div>
   </>:form==='contract'?<>
    <Field label="Proposta" field="proposalId" value={fields.proposalId} onChange={field}
     options={data.proposals.map(p=>({value:String(p.id),label:String(p.title)}))}/>
    <Field label="Modalidade" field="mode" value={fields.mode} onChange={field} options={[
     {value:'written',label:'Formal por escrito'},{value:'verbal',label:'Acordo verbal'},
     {value:'whatsapp',label:'WhatsApp'}]}/>
    <Field label="Condições" field="terms" value={fields.terms} onChange={field}/>
   </>:form==='dome'?<Field label="Nome da cúpula" field="name" value={fields.name} onChange={field} required/>:
   form==='booking'?<>
    <Field label="Apresentação" field="eventId" value={fields.eventId} onChange={field}
     options={dataEvents.map(e=>({value:String(e.id),label:String(e.title)}))}/>
    <Field label="Cúpula" field="domeId" value={fields.domeId} onChange={field}
     options={data.domes.filter(d=>d.active).map(d=>({value:String(d.id),label:String(d.name)}))}/>
    <Field label="Início" field="start" value={fields.start} onChange={field} type="datetime-local" required/>
    <Field label="Término" field="end" value={fields.end} onChange={field} type="datetime-local" required/>
   </>:<>
    <Field label="Descrição" field="description" value={fields.description} onChange={field} required/>
    <Field label="Valor (R$)" field="amount" value={fields.amount} onChange={field} type="number" required/>
    <Field label="Data" field="date" value={fields.date} onChange={field} type="date" required/>
    <Field label="Tipo" field="category" value={fields.category} onChange={field}
     options={[{value:'income',label:'Receita'},{value:'expense',label:'Despesa'}]}/>
    <Field label="Situação" field="status" value={fields.status} onChange={field}
     options={[{value:'planned',label:'Previsto'},{value:'settled',label:'Liquidado'}]}/>
   </>}
   <div style={{gridColumn:'1/-1',display:'flex',gap:10}}>
    <button type="submit" disabled={busy||!writesEnabled}
     style={{padding:12,borderRadius:8,background:'#2563eb',color:'white'}}>{busy?'Salvando...':'Salvar'}</button>
    <button type="button" onClick={()=>setForm(null)}>Cancelar</button>
   </div>
  </form>
 </section>}
 <p style={{fontSize:13,marginTop:18,opacity:.8}}>Módulo comercial em implantação. Gravações liberadas somente após migração e aprovação de segurança.</p>
 </main>;
}
function Rows({heads,rows}:{heads:string[];rows:unknown[][]}){
 if(rows.length===0)return <p style={{padding:20,textAlign:'center'}}>Nenhum registro nesta área.</p>;
 return <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
 <thead><tr>{heads.map(h=><th key={h} style={{textAlign:'left',padding:12,borderBottom:'1px solid #94a3b8'}}>{h}</th>)}</tr></thead>
 <tbody>{rows.map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j} style={{padding:12,borderBottom:'1px solid #e2e8f0'}}>{String(v??'—')}</td>)}</tr>)}</tbody>
 </table></div>;
}
function Field({label,field,value,onChange,options,type='text',required=false}:{
 label:string;field:string;value:string;onChange:(key:string,value:string)=>void;
 options?:{value:string,label:string}[];type?:string;required?:boolean
}){
 const style:React.CSSProperties={width:'100%',padding:11,border:'1px solid #94a3b8',
 borderRadius:8,background:'#fff',color:'#111827'};
 return <label style={{fontSize:14}}>{label}
 {options?<select required value={value||''} onChange={e=>onChange(field,e.target.value)} style={style}>
 <option value="">Selecione</option>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
 </select>:<input type={type} required={required} value={value||''}
 onChange={e=>onChange(field,e.target.value)} min={type==='number'?'0':undefined}
 step={type==='number'?'0.01':undefined} style={style}/>}</label>;
}