'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
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
   setStatus(result.alreadyExists?'Baixa já registrada; não foi duplicada.':'Recebimento registrado no caixa.');
  }catch(e){setStatus(e instanceof Error?e.message:'Erro');}finally{setBusy(false);}
 }
 const input={display:'block' as const,width:'100%',padding:10,border:'1px solid #bfcfe8',borderRadius:8,marginTop:6};
 const box={padding:22,border:'1px solid #cad6ea',borderRadius:14,background:'white',marginBottom:18};
 return <main style={{minHeight:'100vh',background:'#f2f6fd',color:'#102a56',padding:'clamp(18px,5vw,48px)',fontFamily:'Arial,sans-serif'}}>
 <div style={{maxWidth:1050,margin:'auto'}}>
 <Link href="/financeiro">← Voltar ao financeiro</Link>
 <h1>Contas a receber</h1>
 <p>Controle por instituição, vencimento e pagamentos parciais. Títulos não são receitas recebidas.</p>
 {status&&<p role="status" style={{padding:12,background:'#e9effc',borderRadius:8}}>{status}</p>}
 {!writesEnabled&&<p role="status" style={{padding:14,background:'#fff4e5',border:'1px solid #efc991',borderRadius:9,color:'#864413'}}>Novos lançamentos estão temporariamente indisponíveis. Você ainda pode consultar os títulos e recebimentos existentes.</p>}
 <section style={box}><h2>Novo título</h2>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:15}}>
 <label>Instituição<select style={input} value={client} onChange={e=>{setClient(e.target.value);setDraftId(null);}}><option value="">Selecione</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label>Descrição<input style={input} maxLength={300} value={description} onChange={e=>{setDescription(e.target.value);setDraftId(null);}}/></label>
 <label>Valor total (R$)<input style={input} inputMode="decimal" value={total} onChange={e=>{setTotal(e.target.value);setDraftId(null);}} placeholder="0,00"/></label>
 <label>Vencimento<input style={input} type="date" value={due} onChange={e=>{setDue(e.target.value);setDraftId(null);}}/></label>
 </div>
 <button disabled={busy||!writesEnabled} onClick={create} style={{marginTop:16,padding:12,background:'#2454d3',color:'white',borderRadius:8}}>Criar título</button>
 </section>
 <section style={box}><h2>Títulos cadastrados</h2>
 <div style={{overflowX:'auto'}}><table style={{borderCollapse:'collapse',width:'100%',textAlign:'left'}}>
 <thead><tr>{['Instituição / título','Vencimento','Total','Recebido','Pendente','Baixa parcial'].map(c=><th key={c} style={{padding:10,borderBottom:'1px solid #ccd6e7'}}>{c}</th>)}</tr></thead>
 <tbody>{titles.map(t=>{const remain=Math.max(0,Number(t.total)-Number(t.paid));return <tr key={t.id}>
 <td style={{padding:10,borderBottom:'1px solid #e2e9f3'}}><strong>{t.client_name}</strong><div>{t.description}</div></td>
 <td style={{padding:10}}>{String(t.due_on).slice(0,10).split('-').reverse().join('/')}</td>
 <td style={{padding:10}}>{brl(Number(t.total))}</td><td style={{padding:10}}>{brl(Number(t.paid))}</td>
 <td style={{padding:10,fontWeight:700}}>{brl(remain)}</td>
 <td style={{padding:10}}>{remain>0&&<div style={{display:'flex',gap:6}}>
 <input aria-label={'Valor recebido de '+t.client_name} value={payment[t.id]||''} placeholder="R$" inputMode="decimal" style={{width:95,padding:7,border:'1px solid #bbcae1'}} onChange={e=>{setPayment(v=>({...v,[t.id]:e.target.value}));setPayIds(v=>{const n={...v};delete n[t.id];return n;});}}/>
 <button type="button" disabled={busy||!writesEnabled} onClick={()=>pay(t)} style={{padding:8,background:'#2454d3',color:'white',borderRadius:7}}>Receber</button></div>}{remain===0&&'Quitado'}</td>
 </tr>})}</tbody></table></div>
 {!titles.length&&<p>Nenhum título cadastrado.</p>}
 <p style={{fontSize:12}}>As baixas confirmadas aparecem no livro-caixa. Estornos preservam o histórico e devolvem o saldo pendente.</p>
 </section>
 </div></main>;
}
