'use client';
import {useEffect,useState} from 'react';
import FinanceReport from './FinanceReport';

type Entry={id:string;entry_type:'income'|'expense';amount:number;description:string;occurred_on:string;reversal_of:string|null;presentation_title:string|null;dome_name:string|null};
type Data={entries:Entry[];income:number;expenses:number;balance:number;writesEnabled:boolean;limited:boolean;domes:{id:string;name:string;active:boolean}[];presentations:{id:string;title:string;starts_at:string}[]};
type Report={months:{periodo:string;receitas:number;despesas:number}[];years:{ano:number;receitas:number;despesas:number}[];domes:{cupula:string;receitas:number;despesas:number}[];proposals:{id:string;title:string;total:number;status:string}[];notes:string[]};
type Receivable={id:string;client_id:string;client_name:string;description:string;total:number;paid:number;due_on:string};
type Payment={id:string;client_id:string;client_name:string;description:string;amount:number;occurred_on:string};
const brl=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
export default function FinanceiroClient(){
 const [data,setData]=useState<Data|null>(null);
 const [report,setReport]=useState<Report|null>(null);
 const [receivables,setReceivables]=useState<{titles:Receivable[];payments:Payment[]}|null>(null);
 const [receivableError,setReceivableError]=useState('');
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [type,setType]=useState('all');
 const [entryType,setEntryType]=useState('income');
 const [amount,setAmount]=useState('');
 const [description,setDescription]=useState('');
 const [date,setDate]=useState(new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}));
 const [presentation,setPresentation]=useState('');
 const [pendingId,setPendingId]=useState<string|null>(null);
 const [saving,setSaving]=useState(false);
 const [notice,setNotice]=useState('');
 const [reversing,setReversing]=useState<string|null>(null);
 const [dome,setDome]=useState('all');
 const [section,setSection]=useState<'extrato'|'receber'|'relatorios'|'lancamento'>('extrato');
 const [entryPage,setEntryPage]=useState(1);
 const [showValues,setShowValues]=useState(false);
 const [entryModalOpen,setEntryModalOpen]=useState(false);
 const [confirmEntry,setConfirmEntry]=useState(false);
 const [discardEntry,setDiscardEntry]=useState(false);
 const privateMoney=(value:number)=>showValues?brl(value):'R$ •••••';
 const entryDirty=Boolean(amount||description||presentation||entryType!=='income');
 const closeEntry=()=>{if(saving)return;if(entryDirty)setDiscardEntry(true);else setEntryModalOpen(false);};
 async function refreshFinance(){
  const [ledger,reportResponse]=await Promise.all([
   fetch('/api/financeiro',{cache:'no-store'}),
   fetch('/api/financeiro/relatorios',{cache:'no-store'})
  ]);
  if(!ledger.ok)throw new Error('Não foi possível atualizar o extrato.');
  setData(await ledger.json());
  if(reportResponse.ok)setReport(await reportResponse.json());
  const r=await fetch('/api/financeiro/receber',{cache:'no-store'});
  if(r.ok){const j=await r.json();setReceivables({titles:Array.isArray(j.titles)?j.titles:[],payments:Array.isArray(j.payments)?j.payments:[]});setReceivableError('');}
  else setReceivableError('Contas a receber temporariamente indisponíveis.');
 }
 useEffect(()=>{const c=new AbortController();fetch('/api/financeiro/receber',{cache:'no-store',signal:c.signal}).then(async r=>{if(!r.ok)throw Error('Contas a receber indisponíveis.');return r.json()}).then(j=>setReceivables({titles:Array.isArray(j.titles)?j.titles:[],payments:Array.isArray(j.payments)?j.payments:[]})).catch(e=>{if(e.name!=='AbortError')setReceivableError('Não foi possível carregar as contas a receber.')});return()=>c.abort()},[]);
 useEffect(()=>{const c=new AbortController();fetch('/api/financeiro/relatorios',{cache:'no-store',signal:c.signal}).then(r=>r.ok?r.json():null).then(j=>{if(j)setReport(j)}).catch(()=>{});return()=>c.abort()},[]);
 useEffect(()=>{const c=new AbortController();fetch('/api/financeiro',{cache:'no-store',signal:c.signal})
 .then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||'Não foi possível carregar');return j;})
 .then(j=>setData(j)).catch(e=>{if(e.name!=='AbortError')setError(e.message)}).finally(()=>setLoading(false));
 return()=>c.abort();},[]);
 async function saveEntry(){
 if(saving)return;
 const parsed=Number(amount.replace(',','.'));
 if(!Number.isFinite(parsed)||parsed<=0||!description.trim()||!date){setNotice('Preencha valor, descrição e data válidos.');return;}
 if(!confirmEntry){setConfirmEntry(true);return;}
 setConfirmEntry(false);
 const id=pendingId||crypto.randomUUID();setPendingId(id);setSaving(true);setNotice('');
 try{const response=await fetch('/api/financeiro',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,entry_type:entryType,amount:parsed,description,occurred_on:date,presentation_id:presentation||null})});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Falha no lançamento');
 await refreshFinance();
 setNotice(result.alreadyExists?'Lançamento já registrado anteriormente; não foi duplicado.':'Lançamento registrado.');setAmount('');setDescription('');setPresentation('');setPendingId(null);setEntryModalOpen(false);
 }catch(e){setNotice(e instanceof Error?e.message:'Falha desconhecida. Confira o extrato antes de reenviar.');}finally{setSaving(false);}
 }
 async function reverseEntry(id:string){
  if(!data?.writesEnabled||reversing)return;
  const reason=window.prompt('Justificativa obrigatória do estorno (mínimo 8 caracteres):');
  if(!reason||reason.trim().length<8)return;
  if(!window.confirm('Confirma o estorno? Será criado um lançamento inverso auditável.'))return;
  setReversing(id);
  try{
   const res=await fetch('/api/financeiro/estornar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({original_id:id,reason:reason.trim()})});
   const json=await res.json();if(!res.ok)throw Error(json.error||'Estorno não realizado');
   await refreshFinance();setNotice('Estorno registrado com histórico preservado.');
  }catch(e){setNotice(e instanceof Error?e.message:'Erro ao estornar');}finally{setReversing(null);}
 }
 const reversed=new Set((data?.entries||[]).map(x=>x.reversal_of).filter(Boolean));
 const entries=(data?.entries||[]).filter(e=>(type==='all'||e.entry_type===type)&&(dome==='all'||e.dome_name===dome));
 const pageSize=10;
 const pagedEntries=entries.slice((entryPage-1)*pageSize,entryPage*pageSize);
 const card={border:'1px solid #bed0e8',borderRadius:14,padding:20,background:'#fff'};
 return <><style>{`@media print {
 @page { size: A4 portrait; margin: 14mm; }
 body { background: #fff !important; }
 .finance-print-hide { display: none !important; }
 .finance-report-print { border: 0 !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }
 .finance-report-print h2 { color:#163763 !important; font-size:20pt !important; margin-bottom:12px !important; }
 .finance-report-print h3 { color:#163763 !important; margin-top:17px !important; }
 .finance-report-print table { border-collapse:collapse !important; width:100% !important; font-size:10pt !important; }
 .finance-report-print th,.finance-report-print td { border-bottom:1px solid #ddd !important; padding:6px !important; }
 .finance-report-print tr { break-inside:avoid !important; }

 .finance-premium { background:linear-gradient(145deg,#edf4ff 0%,#f6f9ff 48%,#e9f1ff 100%) !important; }
 .finance-premium > div > header {box-shadow:0 12px 26px rgba(17,62,129,.18);border:1px solid #3979c6;}
 .finance-premium nav[aria-label="Áreas financeiras"] {padding:7px;background:#e3eeff;border:1px solid #c8dcfa;border-radius:12px;box-shadow:inset 0 1px 3px rgba(27,73,137,.08);}
 .finance-premium nav[aria-label="Áreas financeiras"] button {box-shadow:0 3px 7px rgba(30,77,145,.12);transition:transform .15s ease,box-shadow .15s ease,background .15s ease;}
 .finance-premium nav[aria-label="Áreas financeiras"] button:hover {transform:translateY(-2px);box-shadow:0 6px 13px rgba(30,77,145,.2);}
 .finance-premium nav[aria-label="Áreas financeiras"] button[aria-pressed="true"] {border-color:#4685d2 !important;box-shadow:inset 0 0 0 2px #5b9be9,0 4px 10px rgba(23,72,141,.18);}
 .finance-premium section.finance-print-hide {background:linear-gradient(165deg,#fff 0%,#f5f9ff 100%);}
 .finance-premium section.finance-print-hide select {background:#edf5ff;border:1px solid #b7d0f3;border-radius:8px;color:#194981;font-weight:600;}
 .finance-premium section.finance-print-hide table tbody tr:nth-child(even) {background:#e8f1ff;}
 .finance-premium section.finance-print-hide table tbody tr:nth-child(odd) {background:#f6f9ff;}
 .finance-premium section.finance-print-hide table tbody tr:hover {background:#e6f1ff;}
 .finance-premium section.finance-print-hide table td {padding:9px 8px !important;}
 .finance-premium .finance-receivables h3 {color:#174b8d;font-size:16px;margin-top:22px;}
 .finance-premium .finance-receivables table thead {background:#dceaff;color:#153e79;}
 .finance-premium .finance-receivables table th {border-bottom:2px solid #a9c8ef !important;}
 .finance-premium .finance-receivables table td {border-bottom:1px solid #d4e2f4;}
 .finance-premium nav[aria-label="Áreas financeiras"] button[aria-pressed="true"] {box-shadow:inset 0 0 0 1px #9fc4ff,0 5px 13px rgba(22,67,133,.28);}
 .finance-premium section.finance-print-hide table td button {background:linear-gradient(130deg,#d4e6ff,#bcd8ff) !important;border:1px solid #7ba8e4 !important;border-radius:7px !important;color:#123d78;font-weight:700;cursor:pointer;box-shadow:0 2px 5px rgba(29,75,136,.13);}
 .finance-premium section.finance-print-hide table td button:hover {background:#d7e8ff;}
 @media(max-width:760px){.finance-premium nav[aria-label="Áreas financeiras"] {grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:6px !important;}.finance-premium nav[aria-label="Áreas financeiras"] button {font-size:12px;padding:9px !important;}}
 @media print {.finance-premium {background:white !important;}.finance-premium section.finance-print-hide table td {padding:6px !important;}}
 }`}</style><main className="finance-premium" style={{background:'#f3f6fc',color:'#11264d',minHeight:'100%',padding:'clamp(16px,3vw,32px)',fontFamily:'Arial,sans-serif'}}>
 <div style={{maxWidth:1120,margin:'0 auto'}}>
 
 <header className="finance-print-hide" style={{background:'linear-gradient(110deg,#143b78,#2467ba)',color:'#fff',borderRadius:16,padding:'22px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><small style={{letterSpacing:1.5}}>ANTARES BUSINESS</small><h1 style={{fontSize:25,margin:'5px 0'}}>Financeiro</h1><p style={{margin:0,fontSize:13}}>Controle de receitas, despesas e recebimentos</p></div></header>
 {loading&&<p className="finance-print-hide">Carregando movimentações...</p>}
 {error&&<p className="finance-print-hide" role="alert" style={{color:'#a32727'}}>{error}</p>}
 {data&&<><div className="finance-print-hide" style={{display:'flex',justifyContent:'flex-end',margin:'12px 0 -8px'}}><button type="button" onClick={()=>setShowValues(v=>!v)} aria-pressed={showValues} style={{background:'#e9f2ff',border:'1px solid #bed0e8',color:'#17457f',padding:'7px 12px',borderRadius:8,cursor:'pointer',fontWeight:700}}>{showValues?'Ocultar valores':'Mostrar valores'}</button></div><div className="finance-print-hide" style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,margin:'18px 0'}}>
 {([['Entradas realizadas',data.income],['Saídas realizadas',data.expenses],['Saldo acumulado',data.balance],['A receber',receivables?.titles.reduce((n,t)=>n+Math.max(0,Number(t.total)-Number(t.paid)),0)??0]] as [string,number][]).map(([label,value])=><div style={{...card,minWidth:0,padding:'12px 14px',borderRadius:10,background:'linear-gradient(145deg,#ffffff 15%,#f0f6ff 100%)',boxShadow:'0 3px 12px rgba(22,65,122,.06)',borderTop:label==='Entradas realizadas'?'3px solid #159b79':label==='Saídas realizadas'?'3px solid #e39c46':label==='A receber'?'3px solid #4388e5':'3px solid #245bb2'}} key={label}><small style={{color:'#486489',fontWeight:600}}>{label}</small><h2 style={{fontSize:17,margin:'6px 0 0',color:'#173d78'}}>{privateMoney(value)}</h2></div>)}</div>

 <nav className="finance-print-hide" aria-label="Áreas financeiras" style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8,margin:'0 0 18px'}}>{([['extrato','Extrato'],['receber','Contas a receber'],['relatorios','Relatórios e fluxo de caixa'],['lancamento','Novo lançamento']] as const).map(([key,label])=><button type="button" key={key} onClick={()=>key==='lancamento'?setEntryModalOpen(true):setSection(key)} aria-pressed={section===key} style={{background:key==='lancamento'?'linear-gradient(120deg,#102f65,#174c96)':section===key?'linear-gradient(120deg,#2057a5,#317bdb)':'linear-gradient(145deg,#eaf3ff,#dbeaff)',color:key==='lancamento'||section===key?'white':'#17457f',border:key==='lancamento'||section===key?'1px solid #123d7b':'1px solid #b7d1f3',padding:'10px 8px',minWidth:0,borderRadius:9,fontWeight:700,cursor:'pointer'}}>{label}</button>)}</nav>
 {section==='extrato'&&<section className="finance-print-hide" style={{...card,background:'linear-gradient(155deg,#f4f8ff 0%,#eaf2ff 55%,#f7faff 100%)',border:'1px solid #a8c6f0',borderTop:'4px solid #2d6cd2',boxShadow:'0 9px 26px rgba(30,75,145,.13)'}}><h2 style={{color:'#164784',fontSize:18,margin:'0 0 6px'}}>Extrato auditável</h2>

 <div style={{display:'flex',gap:12,flexWrap:'wrap',margin:'15px 0'}}>
 <label>Tipo <select value={type} onChange={e=>{setType(e.target.value);setEntryPage(1);}} style={{padding:'9px 13px',marginLeft:8,border:'1px solid #7ca7df',borderRadius:9,background:'linear-gradient(135deg,#dcecff,#c8dfff)',color:'#123d79',fontWeight:700,boxShadow:'0 3px 8px rgba(22,65,122,.14)',cursor:'pointer'}}><option value="all">Todos</option><option value="income">Receitas</option><option value="expense">Despesas</option></select></label>

 </div>
 <div style={{overflowX:'auto',width:'100%'}}><table style={{width:'100%',minWidth:850,tableLayout:'fixed',borderCollapse:'collapse',textAlign:'left',fontSize:13}}><colgroup><col style={{width:'12%'}}/><col style={{width:'27%'}}/><col style={{width:'10%'}}/><col style={{width:'24%'}}/><col style={{width:'27%'}}/></colgroup>
 <thead><tr>{['Data','Descrição','Tipo','Apresentação','Valor'].map(x=><th key={x} style={{padding:'10px 8px',borderBottom:'2px solid #c5d8f4',color:'#17457f',fontSize:12}}>{x}</th>)}</tr></thead>
 <tbody>{pagedEntries.map(e=><tr key={e.id}>
 <td style={{padding:12,borderBottom:'1px solid #e3eaf3',whiteSpace:'nowrap'}}>{String(e.occurred_on).slice(0,10).split('-').reverse().join('/')}</td>
 <td style={{padding:12,borderBottom:'1px solid #e3eaf3'}}>{e.description}{e.reversal_of&&' (estorno)'}</td>
 <td style={{padding:12,borderBottom:'1px solid #e3eaf3'}}>{e.entry_type==='income'?'Receita':'Despesa'}</td>
 <td style={{padding:12,borderBottom:'1px solid #e3eaf3'}}>{e.presentation_title||'Não vinculada'}</td>
 <td style={{padding:12,borderBottom:'1px solid #e3eaf3',fontWeight:700}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,whiteSpace:'nowrap'}}><span style={{fontVariantNumeric:'tabular-nums'}}>{showValues?(e.entry_type==='income'?'+':'−'):' '} {privateMoney(Number(e.amount))}</span>{data.writesEnabled&&!e.reversal_of&&!reversed.has(e.id)&&<button type="button" disabled={!!reversing} onClick={()=>reverseEntry(e.id)} style={{flexShrink:0,padding:'7px 10px',border:'1px solid #174b93',borderRadius:8,background:'linear-gradient(135deg,#1c5db2,#16427f)',color:'#fff',fontWeight:700,boxShadow:'0 3px 8px rgba(17,56,111,.18)',cursor:'pointer'}}>Estornar</button>}</div></td>
 </tr>)}</tbody></table>{entries.length===0&&<p>Nenhuma movimentação encontrada para os filtros selecionados.</p>}</div>
 {entries.length>pageSize&&<div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:12,marginTop:14}}><button type="button" disabled={entryPage<=1} onClick={()=>setEntryPage(p=>Math.max(1,p-1))}>Anterior</button><span>Página {Math.min(entryPage,Math.ceil(entries.length/pageSize))} de {Math.ceil(entries.length/pageSize)}</span><button type="button" disabled={entryPage*pageSize>=entries.length} onClick={()=>setEntryPage(p=>p+1)}>Próxima</button></div>}
 {data.limited&&<p style={{color:'#92400e'}}>Exibindo somente os mil lançamentos mais recentes. Totais não são definitivos.</p>}
 </section>}
 {receivableError&&<p role="alert" style={{color:'#a32727'}}>{receivableError}</p>}
 {section==='receber'&&receivables&&<section className="finance-print-hide finance-receivables" style={{...card,marginTop:20,background:'linear-gradient(155deg,#f7faff,#eaf2ff)',border:'1px solid #aac8ef',borderTop:'4px solid #286bd0',boxShadow:'0 10px 28px rgba(27,72,139,.12)'}}>
 <h2 style={{color:'#164784',fontSize:19,margin:'0 0 12px'}}>Contas a receber — todas as instituições</h2>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,margin:'16px 0'}}>
 {([['Total de cobranças',receivables.titles.reduce((n,t)=>n+Number(t.total||0),0)],['Já recebido',receivables.titles.reduce((n,t)=>n+Number(t.paid||0),0)],['Pendente',receivables.titles.reduce((n,t)=>n+Math.max(0,Number(t.total||0)-Number(t.paid||0)),0)]] as [string,number][]).map(([label,value])=><div key={label} style={{background:'linear-gradient(145deg,#fff,#e5f0ff)',border:'1px solid #b9d2f4',borderTop:label==='Pendente'?'3px solid #d68d36':label==='Já recebido'?'3px solid #159b79':'3px solid #2e6bc2',borderRadius:11,padding:14,boxShadow:'0 4px 12px rgba(28,77,142,.09)'}}><small>{label}</small><h3 style={{margin:'8px 0 0'}}>{brl(value)}</h3></div>)}
 </div>
 <h3>Extrato de cobranças</h3>
 <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'left',fontSize:13}}><thead><tr>{['Instituição','Descrição','Vencimento','Total','Recebido','Pendente'].map(h=><th key={h} style={{padding:9,borderBottom:'1px solid #ccd8ea'}}>{h}</th>)}</tr></thead><tbody>{receivables.titles.map(t=><tr key={t.id}><td style={{padding:9}}>{t.client_name}</td><td style={{padding:9}}>{t.description}</td><td style={{padding:9}}>{String(t.due_on).slice(0,10).split('-').reverse().join('/')}</td><td style={{padding:9}}>{brl(Number(t.total))}</td><td style={{padding:9}}>{brl(Number(t.paid))}</td><td style={{padding:9,fontWeight:700}}>{brl(Math.max(0,Number(t.total)-Number(t.paid)))}</td></tr>)}</tbody></table>{receivables.titles.length===0&&<p>Nenhuma cobrança cadastrada.</p>}</div>
 <h3 style={{marginTop:22}}>Extrato de recebimentos por instituição</h3>
 <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'left',fontSize:13}}><thead><tr>{['Data','Instituição','Descrição','Valor recebido'].map(h=><th key={h} style={{padding:9,borderBottom:'1px solid #ccd8ea'}}>{h}</th>)}</tr></thead><tbody>{receivables.payments.map(p=><tr key={p.id}><td style={{padding:9}}>{String(p.occurred_on).slice(0,10).split('-').reverse().join('/')}</td><td style={{padding:9}}>{p.client_name}</td><td style={{padding:9}}>{p.description}</td><td style={{padding:9,fontWeight:700,color:'#16724a'}}>+ {brl(Number(p.amount))}</td></tr>)}</tbody></table>{receivables.payments.length===0&&<p>Nenhum recebimento vinculado.</p>}</div>
 
 </section>}
 {section==='relatorios'&&report&&<FinanceReport report={report}/>} 
  {entryModalOpen&&<div className="finance-print-hide" role="presentation" style={{position:'fixed',inset:0,zIndex:5000,background:'rgba(7,24,53,.68)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}><section role="dialog" aria-modal="true" aria-label="Novo lançamento" style={{...card,width:'min(100%,530px)',maxHeight:'92vh',overflowY:'auto',padding:0,boxShadow:'0 24px 70px #091b3b66'}}><header style={{background:'linear-gradient(110deg,#143b78,#2467ba)',color:'#fff',padding:'15px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><h2 style={{margin:0,fontSize:18}}>Novo lançamento</h2><button type="button" onClick={closeEntry} aria-label="Fechar" style={{background:'transparent',border:0,color:'white',fontSize:23,cursor:'pointer'}}>×</button></header><div style={{padding:20,background:'linear-gradient(180deg,#f2f7ff 0%,#fff 75%)',color:'#173e73'}}>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:14}}>
 <label>Tipo<select value={entryType} onChange={e=>{setEntryType(e.target.value);setPendingId(null);}} style={{display:'block',width:'100%',padding:'11px 12px',marginTop:6,border:'1px solid #b7cdeb',borderRadius:9,background:'#fff',color:'#173e73',outlineColor:'#2868c8'}}><option value="income">Receita recebida</option><option value="expense">Despesa paga</option></select></label>
 <label>Valor (R$)<input value={amount} onChange={e=>{setAmount(e.target.value);setPendingId(null);}} inputMode="decimal" placeholder="0,00" style={{display:'block',width:'100%',padding:'11px 12px',marginTop:6,border:'1px solid #b7cdeb',borderRadius:9,background:'#fff',color:'#173e73',outlineColor:'#2868c8'}}/></label>
 <label>Data<input type="date" value={date} onChange={e=>{setDate(e.target.value);setPendingId(null);}} style={{display:'block',width:'100%',padding:'11px 12px',marginTop:6,border:'1px solid #b7cdeb',borderRadius:9,background:'#fff',color:'#173e73',outlineColor:'#2868c8'}}/></label>
 <label>Apresentação (opcional)<select value={presentation} onChange={e=>{setPresentation(e.target.value);setPendingId(null);}} style={{display:'block',width:'100%',padding:'11px 12px',marginTop:6,border:'1px solid #b7cdeb',borderRadius:9,background:'#fff',color:'#173e73',outlineColor:'#2868c8'}}><option value="">Sem vínculo</option>{data.presentations.map(p=><option value={p.id} key={p.id}>{p.title}</option>)}</select></label>
 </div>
 <label style={{display:'block',marginTop:16}}>Descrição<input value={description} maxLength={500} onChange={e=>{setDescription(e.target.value);setPendingId(null);}} placeholder="Ex.: recebimento da apresentação / combustível" style={{display:'block',width:'100%',padding:'11px 12px',marginTop:6,border:'1px solid #b7cdeb',borderRadius:9,background:'#fff',color:'#173e73',outlineColor:'#2868c8'}}/></label>
 {data.writesEnabled===false&&<p role="status" style={{background:'#fff7ed',padding:12,borderRadius:9,color:'#8a4618'}}>Novos lançamentos estão temporariamente indisponíveis. Você ainda pode consultar o extrato e os relatórios.</p>}
 <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}><button type="button" onClick={closeEntry} disabled={saving} style={{padding:'10px 15px',borderRadius:8,background:'#e9f2ff',border:0,color:'#17457f'}}>Cancelar</button><button type="button" disabled={saving||!data.writesEnabled} onClick={saveEntry} style={{background:'linear-gradient(110deg,#1754b0,#3479e4)',color:'white',padding:'10px 15px',borderRadius:9,border:0,fontWeight:700,boxShadow:'0 3px 9px #1b57a833'}}>{saving?'Registrando...':'Confirmar lançamento'}</button></div>
 {notice&&<p role="status">{notice}</p>}
 
 </div></section></div>}
 {confirmEntry&&<div className="finance-print-hide" style={{position:'fixed',inset:0,zIndex:5100,background:'rgba(7,24,53,.75)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}><section role="alertdialog" aria-modal="true" aria-label="Confirmar lançamento" style={{...card,width:'min(100%,420px)',padding:0,overflow:'hidden'}}><header style={{background:'#174b91',color:'white',padding:16,fontWeight:700}}>Confirmar movimentação</header><div style={{padding:18}}><p>Registrar {brl(Number(amount.replace(',','.')))} como {entryType==='income'?'receita':'despesa'}? O lançamento ficará no histórico auditável.</p><div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button type="button" onClick={()=>setConfirmEntry(false)}>Voltar</button><button type="button" disabled={saving} onClick={saveEntry} style={{background:'#2454d3',color:'white',border:0,borderRadius:8,padding:'10px 14px'}}>Confirmar</button></div></div></section></div>}
 {discardEntry&&<div className="finance-print-hide" style={{position:'fixed',inset:0,zIndex:5100,background:'rgba(7,24,53,.75)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}><section role="alertdialog" aria-modal="true" aria-label="Descartar lançamento" style={{...card,width:'min(100%,420px)',padding:0,overflow:'hidden'}}><header style={{background:'#174b91',color:'white',padding:16,fontWeight:700}}>Descartar preenchimento?</header><div style={{padding:18}}><p>As informações não salvas serão perdidas.</p><div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button type="button" onClick={()=>setDiscardEntry(false)}>Continuar editando</button><button type="button" onClick={()=>{setDiscardEntry(false);setEntryModalOpen(false);setAmount('');setDescription('');setPresentation('');setEntryType('income');setPendingId(null);}} style={{background:'#a33c43',color:'white',border:0,borderRadius:8,padding:'10px 14px'}}>Descartar</button></div></div></section></div>}
 </>}
 </div></main></>;
}
