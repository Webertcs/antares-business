'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Entry={id:string;entry_type:'income'|'expense';amount:number;description:string;occurred_on:string;reversal_of:string|null;presentation_title:string|null;dome_name:string|null};
type Data={entries:Entry[];income:number;expenses:number;balance:number;writesEnabled:boolean;limited:boolean;domes:{id:string;name:string;active:boolean}[];presentations:{id:string;title:string;starts_at:string}[]};
type Report={months:{periodo:string;receitas:number;despesas:number}[];years:{ano:number;receitas:number;despesas:number}[];domes:{cupula:string;receitas:number;despesas:number}[];proposals:{id:string;title:string;total:number;status:string}[];notes:string[]};
const brl=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
export default function FinanceiroClient(){
 const [data,setData]=useState<Data|null>(null);
 const [report,setReport]=useState<Report|null>(null);
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
 async function refreshFinance(){
  const [ledger,reportResponse]=await Promise.all([
   fetch('/api/financeiro',{cache:'no-store'}),
   fetch('/api/financeiro/relatorios',{cache:'no-store'})
  ]);
  if(!ledger.ok)throw new Error('Não foi possível atualizar o extrato.');
  setData(await ledger.json());
  if(reportResponse.ok)setReport(await reportResponse.json());
 }
 useEffect(()=>{const c=new AbortController();fetch('/api/financeiro/relatorios',{cache:'no-store',signal:c.signal}).then(r=>r.ok?r.json():null).then(j=>{if(j)setReport(j)}).catch(()=>{});return()=>c.abort()},[]);
 useEffect(()=>{const c=new AbortController();fetch('/api/financeiro',{cache:'no-store',signal:c.signal})
 .then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||'Não foi possível carregar');return j;})
 .then(j=>setData(j)).catch(e=>{if(e.name!=='AbortError')setError(e.message)}).finally(()=>setLoading(false));
 return()=>c.abort();},[]);
 async function saveEntry(){
 if(saving)return;
 const parsed=Number(amount.replace(',','.'));
 if(!Number.isFinite(parsed)||parsed<=0||!description.trim()||!date){setNotice('Preencha valor, descrição e data válidos.');return;}
 if(!window.confirm('Confirma o lançamento de '+brl(parsed)+' como '+(entryType==='income'?'receita':'despesa')+'? Esta operação ficará registrada no livro-caixa.'))return;
 const id=pendingId||crypto.randomUUID();setPendingId(id);setSaving(true);setNotice('');
 try{const response=await fetch('/api/financeiro',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,entry_type:entryType,amount:parsed,description,occurred_on:date,presentation_id:presentation||null})});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Falha no lançamento');
 await refreshFinance();
 setNotice(result.alreadyExists?'Lançamento já registrado anteriormente; não foi duplicado.':'Lançamento registrado.');setAmount('');setDescription('');setPresentation('');setPendingId(null);
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
 }`}</style><main style={{background:'#f3f6fc',color:'#11264d',minHeight:'100vh',padding:'clamp(20px,5vw,52px)',fontFamily:'Arial,sans-serif'}}>
 <div style={{maxWidth:1120,margin:'0 auto'}}>
 <div className="finance-print-hide"><Link href="/" style={{color:'#2854a3'}}>← Voltar ao painel</Link></div>
 <p className="finance-print-hide" style={{letterSpacing:2,fontSize:12,marginTop:25}}>ANTARES BUSINESS · BLOCO 07C</p>
 <h1 className="finance-print-hide" style={{fontSize:32,margin:'8px 0'}}>Gestão financeira</h1>
 <p className="finance-print-hide">Livro-caixa real, sem incluir propostas ou sinais apenas previstos. Acesso exclusivo do proprietário.</p>
 {loading&&<p className="finance-print-hide">Carregando movimentações...</p>}
 {error&&<p className="finance-print-hide" role="alert" style={{color:'#a32727'}}>{error}</p>}
 {data&&<><div className="finance-print-hide" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:14,margin:'26px 0'}}>
 {([['Entradas realizadas',data.income],['Saídas realizadas',data.expenses],['Saldo acumulado',data.balance]] as [string,number][]).map(([label,value])=><div style={card} key={label}><small>{label}</small><h2 style={{fontSize:25}}>{brl(value)}</h2></div>)}</div>
 <section className="finance-print-hide" style={card}><h2>Extrato auditável</h2>
 <p style={{fontSize:13}}>Lançamentos confirmados no livro-caixa. Estornos permanecem no histórico.</p>
 <div style={{display:'flex',gap:12,flexWrap:'wrap',margin:'15px 0'}}>
 <label>Tipo <select value={type} onChange={e=>setType(e.target.value)} style={{padding:8,marginLeft:6}}><option value="all">Todos</option><option value="income">Receitas</option><option value="expense">Despesas</option></select></label>
 <label>Cúpula <select value={dome} onChange={e=>setDome(e.target.value)} style={{padding:8,marginLeft:6}}><option value="all">Todas</option>{data.domes.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}</select></label>
 </div>
 <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'left'}}>
 <thead><tr>{['Data','Descrição','Tipo','Apresentação / cúpula','Valor'].map(x=><th key={x} style={{padding:12,borderBottom:'1px solid #ccd8ea'}}>{x}</th>)}</tr></thead>
 <tbody>{entries.map(e=><tr key={e.id}>
 <td style={{padding:12,borderBottom:'1px solid #e3eaf3',whiteSpace:'nowrap'}}>{String(e.occurred_on).slice(0,10).split('-').reverse().join('/')}</td>
 <td style={{padding:12,borderBottom:'1px solid #e3eaf3'}}>{e.description}{e.reversal_of&&' (estorno)'}</td>
 <td style={{padding:12,borderBottom:'1px solid #e3eaf3'}}>{e.entry_type==='income'?'Receita':'Despesa'}</td>
 <td style={{padding:12,borderBottom:'1px solid #e3eaf3'}}>{e.presentation_title||'Não vinculada'}{e.dome_name&&' · '+e.dome_name}</td>
 <td style={{padding:12,borderBottom:'1px solid #e3eaf3',fontWeight:700}}>{e.entry_type==='income'?'+':'−'} {brl(Number(e.amount))} {data.writesEnabled&&!e.reversal_of&&!reversed.has(e.id)&&<button type="button" disabled={!!reversing} onClick={()=>reverseEntry(e.id)} style={{marginLeft:8,padding:5,border:'1px solid #bdcbe0',borderRadius:6}}>Estornar</button>}</td>
 </tr>)}</tbody></table>{entries.length===0&&<p>Nenhuma movimentação encontrada para os filtros selecionados.</p>}</div>
 {data.limited&&<p style={{color:'#92400e'}}>Exibindo somente os mil lançamentos mais recentes. Totais não são definitivos.</p>}
 </section>
 {report&&<section className="finance-report-print" style={{...card,marginTop:20}}>
 <h2>Fluxo de caixa e relatórios gerenciais</h2>
 <p style={{fontSize:13}}>Valores efetivamente realizados. Propostas comerciais não entram no saldo do caixa.</p>
 <div style={{overflowX:'auto'}}><h3>Resumo mensal</h3><table style={{width:'100%',textAlign:'left'}}><thead><tr><th>Período</th><th>Receitas</th><th>Despesas</th><th>Saldo</th></tr></thead><tbody>{report.months.map(m=><tr key={m.periodo}><td>{m.periodo}</td><td>{brl(Number(m.receitas))}</td><td>{brl(Number(m.despesas))}</td><td>{brl(Number(m.receitas)-Number(m.despesas))}</td></tr>)}</tbody></table>{!report.months.length&&<p>Sem movimentações realizadas.</p>}</div>
 <h3>Resumo anual</h3><div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left'}}><thead><tr><th>Ano</th><th>Receitas</th><th>Despesas</th><th>Resultado de caixa</th></tr></thead><tbody>{report.years.map(y=><tr key={y.ano}><td>{y.ano}</td><td>{brl(Number(y.receitas))}</td><td>{brl(Number(y.despesas))}</td><td>{brl(Number(y.receitas)-Number(y.despesas))}</td></tr>)}</tbody></table></div>
 <h3>Por cúpula</h3><div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left'}}><thead><tr><th>Cúpula</th><th>Receitas</th><th>Despesas</th><th>Saldo</th></tr></thead><tbody>{report.domes.map(d=><tr key={d.cupula}><td>{d.cupula}</td><td>{brl(Number(d.receitas))}</td><td>{brl(Number(d.despesas))}</td><td>{brl(Number(d.receitas)-Number(d.despesas))}</td></tr>)}</tbody></table></div>
 <h3>Carteira comercial — valores previstos</h3><p style={{fontSize:13}}>Propostas em andamento ou aceitas. Não constituem, por si só, títulos a receber e não entram no saldo bancário.</p>
 {report.proposals.map(p=><p key={p.id} style={{fontSize:14}}>{p.title} — {brl(Number(p.total||0))} ({p.status})</p>)}
 {!report.proposals.length&&<p>Sem propostas comerciais abertas.</p>}
 <button type="button" className="finance-print-hide" onClick={()=>window.print()} style={{padding:'10px 14px',borderRadius:8,background:'#2454d3',color:'white'}}>Imprimir relatório / salvar PDF</button>
 <p style={{fontSize:12,opacity:.7}}>Relatório gerencial de caixa. Não substitui balanço patrimonial, DRE ou balancete contábil.</p>
 </section>}
  <section className="finance-print-hide" style={{...card,marginTop:20}}><h2>Novo lançamento</h2><p>Somente valores efetivamente recebidos ou pagos. Propostas e sinais previstos não devem ser lançados como recebidos.</p>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12}}>
 <label>Tipo<select value={entryType} onChange={e=>{setEntryType(e.target.value);setPendingId(null);}} style={{display:'block',width:'100%',padding:10}}><option value="income">Receita recebida</option><option value="expense">Despesa paga</option></select></label>
 <label>Valor (R$)<input value={amount} onChange={e=>{setAmount(e.target.value);setPendingId(null);}} inputMode="decimal" placeholder="0,00" style={{display:'block',width:'100%',padding:10}}/></label>
 <label>Data<input type="date" value={date} onChange={e=>{setDate(e.target.value);setPendingId(null);}} style={{display:'block',width:'100%',padding:10}}/></label>
 <label>Apresentação (opcional)<select value={presentation} onChange={e=>{setPresentation(e.target.value);setPendingId(null);}} style={{display:'block',width:'100%',padding:10}}><option value="">Sem vínculo</option>{data.presentations.map(p=><option value={p.id} key={p.id}>{p.title}</option>)}</select></label>
 </div>
 <label style={{display:'block',marginTop:14}}>Descrição<input value={description} maxLength={500} onChange={e=>{setDescription(e.target.value);setPendingId(null);}} placeholder="Ex.: recebimento da apresentação / combustível" style={{display:'block',width:'100%',padding:10}}/></label>
 {data.writesEnabled===false&&<p role="status" style={{background:'#fff7ed',padding:12,borderRadius:9,color:'#8a4618'}}>Lançamentos temporariamente bloqueados enquanto a integração é homologada. O extrato e os relatórios continuam disponíveis.</p>}
 <button type="button" disabled={saving||!data.writesEnabled} onClick={saveEntry} style={{background:'#2454d3',color:'white',padding:'12px 18px',borderRadius:9,marginTop:14}}>{saving?'Registrando...':'Confirmar lançamento'}</button>
 {notice&&<p role="status">{notice}</p>}
 <p style={{fontSize:12,opacity:.7}}>Em caso de erro, confira o extrato antes de tentar novamente. Estornos criam um lançamento inverso, preservando o original. A função fica disponível somente após migração e homologação.</p>
 </section>
 </>}
 </div></main></>;
}
