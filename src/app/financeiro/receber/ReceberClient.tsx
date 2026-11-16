'use client';
import {useEffect,useState} from 'react';

type Title={id:string;client_id:string;client_name:string;description:string;total:number;paid:number;due_on:string};
type Client={id:string;name:string};
const brl=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
export default function ReceberClient(){
 const [titles,setTitles]=useState<Title[]>([]),[clients,setClients]=useState<Client[]>([]);
 const [status,setStatus]=useState('Carregando...'),[busy,setBusy]=useState(false);
 const [writesEnabled,setWritesEnabled]=useState(false);
 const [client,setClient]=useState(''),[description,setDescription]=useState(''),[total,setTotal]=useState(''),[due,setDue]=useState(today());
 const [payment,setPayment]=useState<Record<string,string>>({});
 const [draftId,setDraftId]=useState<string|null>(null);
 const [payIds,setPayIds]=useState<Record<string,string>>({});
 async function load(){
  const res=await fetch('/api/financeiro/receber',{cache:'no-store'});
  const data=await res.json();
  if(!res.ok)throw Error(data.error||'Consulta indisponível');
  setTitles(data.titles);setClients(data.clients);setWritesEnabled(data.writesEnabled===true);setStatus('');
 }
 useEffect(()=>{load().catch(e=>setStatus(e.message))},[]);
 async function post(payload:Record<string,unknown>){
  const res=await fetch('/api/financeiro/receber',{method:'POST',
   headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await res.json();if(!res.ok)throw Error(data.error||'Operação não concluída');
  return data;
 }
 async function create(){
  if(busy||!writesEnabled)return;
  const amount=Number(total.replace(',','.'));
  if(!client||!description.trim()||!Number.isFinite(amount)||amount<=0||!due){setStatus('Preencha cliente, descrição, valor e vencimento.');return;}
  if(!window.confirm('Criar título de '+brl(amount)+'? Isso não registra receita recebida.'))return;
  const id=draftId||crypto.randomUUID();setDraftId(id);setBusy(true);
  try{await post({action:'create',id,client_id:client,description,total:amount,due_on:due});
   await load();setStatus('Título criado. Nenhuma receita foi lançada.');setDraftId(null);setDescription('');setTotal('');
  }catch(e){setStatus(e instanceof Error?e.message:'Erro');}finally{setBusy(false);}
 }
 async function pay(t:Title){
  if(busy)return;
  const amount=Number((payment[t.id]||'').replace(',','.'));
  const outstanding=Math.max(0,Number(t.total)-Number(t.paid));
  if(!Number.isFinite(amount)||amount<=0||amount>outstanding){setStatus('Valor deve ser maior que zero e não exceder o saldo.');return;}
  if(!window.confirm('Confirmar recebimento REAL de '+brl(amount)+'? Será registrado no caixa.'))return;
  const id=payIds[t.id]||crypto.randomUUID();setPayIds(v=>({...v,[t.id]:id}));setBusy(true);
  try{const result=await post({action:'pay',id,receivable_id:t.id,amount,paid_on:today()});
   await load();setPayment(v=>({...v,[t.id]:''}));setPayIds(v=>{const n={...v};delete n[t.id];return n;});
   setStatus(result.alreadyExists?'Este recebimento já estava registrado; nenhum lançamento foi duplicado.':'');
  }catch(e){setStatus(e instanceof Error?e.message:'Erro');}finally{setBusy(false);}
 }
 const input={display:'block' as const,width:'100%',padding:'11px 12px',border:'1px solid #a9c5e9',borderRadius:10,marginTop:7,background:'linear-gradient(180deg,#fff,#f3f8ff)',boxShadow:'inset 0 1px 3px rgba(24,64,123,.07),0 2px 6px rgba(24,64,123,.06)',color:'#183458',fontSize:14};
 const box={padding:'24px 26px',border:'1px solid #c3d8f4',borderLeft:'4px solid #3679d3',borderRadius:16,background:'linear-gradient(160deg,#ffffff 55%,#f5f9ff)',marginBottom:22,boxShadow:'0 12px 28px rgba(23,64,125,.12),0 2px 5px rgba(23,64,125,.06)'};
 return <main style={{minHeight:'100%',background:'#f2f6fd',color:'#102a56',padding:'clamp(16px,3vw,32px)',fontFamily:'inherit'}}>
 <div style={{maxWidth:1180,margin:'auto'}}>
 
 <header style={{background:'linear-gradient(110deg,#173f83,#2871c4)',color:'#fff',borderRadius:14,padding:'24px 28px',marginBottom:22,boxShadow:'0 8px 24px rgba(23,63,131,.12)'}}><div style={{fontSize:11,fontWeight:700,letterSpacing:'0.12em',opacity:.85,marginBottom:8}}>FINANCEIRO · ANTARES BUSINESS</div><h1 style={{fontSize:27,fontWeight:750,margin:'0 0 7px'}}>Contas a receber</h1><p style={{margin:0,fontSize:14,opacity:.9}}>Acompanhe títulos, vencimentos e pagamentos em um só lugar.</p></header>
 {status&&<p role="status" style={{padding:12,background:'#e9effc',borderRadius:8}}>{status}</p>}
 {!writesEnabled&&<p role="status" style={{padding:14,background:'#fff4e5',border:'1px solid #efc991',borderRadius:9,color:'#864413'}}>Novos lançamentos estão temporariamente indisponíveis. Você ainda pode consultar os títulos e recebimentos existentes.</p>}
 <section style={box}><h2 style={{fontSize:19,fontWeight:800,color:'#174987',margin:'0 0 20px',paddingBottom:15,borderBottom:'2px solid #d9e8fa'}}>Novo título</h2>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:15}}>
 <label>Instituição<select style={input} value={client} onChange={e=>{setClient(e.target.value);setDraftId(null);}}><option value="">Selecione</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label>Descrição<input style={input} maxLength={300} value={description} onChange={e=>{setDescription(e.target.value);setDraftId(null);}}/></label>
 <label>Valor total (R$)<input style={input} inputMode="decimal" value={total} onChange={e=>{setTotal(e.target.value);setDraftId(null);}} placeholder="0,00"/></label>
 <label>Vencimento<input style={input} type="date" value={due} onChange={e=>{setDue(e.target.value);setDraftId(null);}}/></label>
 </div>
 <button disabled={busy||!writesEnabled} onClick={create} style={{marginTop:18,padding:'11px 18px',background:'linear-gradient(135deg,#174d9b,#317fe1)',color:'white',border:'1px solid #245cae',borderRadius:10,fontWeight:800,boxShadow:'0 5px 12px rgba(32,94,180,.28)',cursor:'pointer'}}>Criar título</button>
 </section>
 <section style={box}><h2 style={{fontSize:19,fontWeight:800,color:'#174987',margin:'0 0 18px',paddingBottom:15,borderBottom:'2px solid #d9e8fa'}}>Títulos cadastrados <span style={{fontSize:12,fontWeight:600,color:'#607b9f',marginLeft:6}}>({titles.length})</span></h2>
 <div style={{overflowX:'auto'}}><table style={{borderCollapse:'collapse',width:'100%',textAlign:'left',fontSize:13,minWidth:760}}>
 <thead><tr>{['Instituição / título','Vencimento','Total','Recebido','Pendente','Baixa parcial'].map(c=><th key={c} style={{padding:'13px 11px',borderBottom:'2px solid #d8e4f4',background:'#e9f2ff',fontWeight:800,color:'#174987',whiteSpace:'nowrap'}}>{c}</th>)}</tr></thead>
 <tbody>{titles.map(t=>{const remain=Math.max(0,Number(t.total)-Number(t.paid));return <tr key={t.id} style={{background:titles.indexOf(t)%2===0?'#ffffff':'#f1f6fe'}}>
 <td style={{padding:'14px 11px',borderBottom:'1px solid #dce8f8'}}><strong>{t.client_name}</strong><div>{t.description}</div></td>
 <td style={{padding:'14px 11px',borderBottom:'1px solid #e2e9f3',whiteSpace:'nowrap'}}>{String(t.due_on).slice(0,10).split('-').reverse().join('/')}</td>
 <td style={{padding:'14px 11px',borderBottom:'1px solid #dce8f8',whiteSpace:'nowrap'}}>{brl(Number(t.total))}</td><td style={{padding:10}}>{brl(Number(t.paid))}</td>
 <td style={{padding:'14px 11px',borderBottom:'1px solid #e2e9f3',fontWeight:700,whiteSpace:'nowrap'}}>{brl(remain)}</td>
 <td style={{padding:10}}>{remain>0&&<div style={{display:'flex',gap:6}}>
 <input aria-label={'Valor recebido de '+t.client_name} value={payment[t.id]||''} placeholder="R$" inputMode="decimal" style={{width:92,padding:9,border:'1px solid #a9c5e9',borderRadius:8,background:'#fff',boxShadow:'0 2px 5px rgba(24,64,123,.07)'}} onChange={e=>{setPayment(v=>({...v,[t.id]:e.target.value}));setPayIds(v=>{const n={...v};delete n[t.id];return n;});}}/>
 <button type="button" disabled={busy||!writesEnabled} onClick={()=>pay(t)} style={{padding:'9px 12px',background:'linear-gradient(135deg,#174d9b,#317fe1)',color:'white',border:'1px solid #245cae',borderRadius:8,fontWeight:800,boxShadow:'0 4px 9px rgba(32,94,180,.22)',cursor:'pointer'}}>Receber</button></div>}{remain===0&&'Quitado'}</td>
 </tr>})}</tbody></table></div>
 {!titles.length&&<p>Nenhum título cadastrado.</p>}
 </section>
 </div></main>;
}
