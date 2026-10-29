'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
type RecordRow=Record<string,unknown>;
type State={clients:RecordRow[];proposals:RecordRow[];contracts:RecordRow[];domes:RecordRow[];bookings:RecordRow[];ledger:RecordRow[];audit:RecordRow[]};
const empty:State={clients:[],proposals:[],contracts:[],domes:[],bookings:[],ledger:[],audit:[]};
const money=(value:unknown)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value)||0);
const date=(value:unknown)=>value?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(String(value))):'—';
const dateTime=(value:unknown)=>value?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(String(value))):'—';
export default function OperacaoV1(){
 const [data,setData]=useState<State>(empty),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const [tab,setTab]=useState<'comercial'|'contratos'|'agenda'|'financeiro'|'auditoria'>('comercial');
 const [term,setTerm]=useState('');
 useEffect(()=>{const ctrl=new AbortController();
  fetch('/api/business',{cache:'no-store',signal:ctrl.signal}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error||'Falha na consulta');setData(b);})
  .catch(e=>{if(e.name!=='AbortError')setError(e instanceof Error?e.message:'Consulta indisponível');})
  .finally(()=>setLoading(false));return()=>ctrl.abort();
 },[]);
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
 {tab==='comercial'&&<section style={base}><h2 style={{fontSize:21,fontWeight:650}}>Propostas e orçamentos</h2><p>Valores previstos, negociação e condições comerciais por cliente.</p>
  <input aria-label="Pesquisar proposta" placeholder="Pesquisar proposta ou cliente" value={term} onChange={e=>setTerm(e.target.value)} style={{padding:11,border:'1px solid #94a3b8',borderRadius:8,width:'100%',margin:'10px 0'}}/>
  <Rows heads={['Proposta','Cliente','Total','Situação','Validade']}
   rows={filtered.map(p=>[p.title,p.client_name,money(p.total),p.status,date(p.valid_until)])}/></section>}
 {tab==='contratos'&&<section style={base}><h2 style={{fontSize:21,fontWeight:650}}>Contratos e confirmações</h2>
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
 <p style={{fontSize:13,marginTop:18,opacity:.8}}>Módulos V1 em implantação. Nenhum botão de gravação será apresentado antes da validação da segurança e da migração.</p>
 </main>;
}
function Rows({heads,rows}:{heads:string[];rows:unknown[][]}){
 if(rows.length===0)return <p style={{padding:20,textAlign:'center'}}>Nenhum registro nesta área.</p>;
 return <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
 <thead><tr>{heads.map(h=><th key={h} style={{textAlign:'left',padding:12,borderBottom:'1px solid #94a3b8'}}>{h}</th>)}</tr></thead>
 <tbody>{rows.map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j} style={{padding:12,borderBottom:'1px solid #e2e8f0'}}>{String(v??'—')}</td>)}</tr>)}</tbody>
 </table></div>;
}