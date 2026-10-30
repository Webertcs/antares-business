'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
type RecordRow=Record<string,unknown>;
type State={clients:RecordRow[];proposals:RecordRow[];contracts:RecordRow[];domes:RecordRow[];bookings:RecordRow[];ledger:RecordRow[];audit:RecordRow[]};
const empty:State={clients:[],proposals:[],contracts:[],domes:[],bookings:[],ledger:[],audit:[]};
const money=(value:unknown)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value)||0);
const date=(value:unknown)=>value?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(String(value))):'—';
const dateTime=(value:unknown)=>value?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(String(value))):'—';
export default function OperacaoV1({writesEnabled}:{writesEnabled:boolean}){
 const [data,setData]=useState<State>(empty),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const [tab,setTab]=useState<'comercial'|'contratos'|'agenda'|'financeiro'|'auditoria'>('comercial');
 const [term,setTerm]=useState('');
 const [revision,setRevision]=useState(0);
 const [form,setForm]=useState<'proposal'|'contract'|null>(null);
 const [fields,setFields]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(false);
 const [feedback,setFeedback]=useState('');
 function openForm(type:'proposal'|'contract'){
  setForm(type);setFeedback('');
  setFields(type==='proposal'?{clientId:'',title:'',model:'per_student',attendees:'30',
    unitPrice:'10',fixedPrice:'0',discount:'0',deposit:'0',validUntil:'',notes:''}:
    {proposalId:'',mode:'written',terms:''});
 }
 function field(k:string,v:string){setFields(old=>({...old,[k]:v}));}
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!writesEnabled||!form||busy)return;
  const n=(k:string)=>Number(fields[k]||0);
  const body=form==='proposal'?{action:'proposal',...fields,
    attendees:n('attendees'),unitPrice:n('unitPrice'),fixedPrice:n('fixedPrice'),
    discount:n('discount'),deposit:n('deposit')}: {action:'contract',...fields};
  setBusy(true);setFeedback('');
  try{
   const response=await fetch('/api/business/gravar',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Não foi possível salvar');
   setForm(null);setRevision(v=>v+1);setFeedback('Registro comercial salvo com sucesso.');
  }catch(e){setFeedback(e instanceof Error?e.message:'Erro ao salvar');}
  finally{setBusy(false);}
 }
 useEffect(()=>{const ctrl=new AbortController();
  fetch('/api/business',{cache:'no-store',signal:ctrl.signal}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error||'Falha na consulta');setData(b);})
  .catch(e=>{if(e.name!=='AbortError')setError(e instanceof Error?e.message:'Consulta indisponível');})
  .finally(()=>setLoading(false));return()=>ctrl.abort();
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
 {tab==='agenda'&&<section style={base}><h2 style={{fontSize:21,fontWeight:650}}>Cúpulas e apresentações</h2>
  <p>Equipamentos cadastrados: {data.domes.map(d=>String(d.name)).join(' · ')||'nenhum'}.</p>
  <Rows heads={['Apresentação','Cúpula','Início','Término','Situação']}
  rows={data.bookings.map(b=>[b.event_title,b.dome_name,dateTime(b.starts_at),dateTime(b.ends_at),b.status])}/></section>}
 {tab==='financeiro'&&<section style={base}><h2 style={{fontSize:21,fontWeight:650}}>Extrato operacional</h2>
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
  <h2 style={{fontWeight:700,fontSize:21}}>{form==='proposal'?'Nova proposta comercial':'Novo contrato'}</h2>
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
   </>:<>
    <Field label="Proposta" field="proposalId" value={fields.proposalId} onChange={field}
     options={data.proposals.map(p=>({value:String(p.id),label:String(p.title)}))}/>
    <Field label="Modalidade" field="mode" value={fields.mode} onChange={field} options={[
     {value:'written',label:'Formal por escrito'},{value:'verbal',label:'Acordo verbal'},
     {value:'whatsapp',label:'WhatsApp'}]}/>
    <Field label="Condições" field="terms" value={fields.terms} onChange={field}/>
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