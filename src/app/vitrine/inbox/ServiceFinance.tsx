'use client';

import {useEffect,useRef,useState,type FormEvent,type CSSProperties} from 'react';
import {Wallet,X,ReceiptText,CheckCircle2} from 'lucide-react';

export type FinanceTitle={
 id:string;client_id:string;proposal_id:string|null;client_name:string;
 description:string;total:number;paid:number;due_on:string
};
export type FinanceData={titles:FinanceTitle[];payments:unknown[];writesEnabled:boolean;limited?:boolean};
type Pending=
 |{kind:'create';id:string;amount:number;description:string;due:string}
 |{kind:'pay';id:string;receivableId:string;description:string;amount:number;paidOn:string};
const fmt=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
const dateBR=(s:string)=>/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(s)?s.slice(0,10).split('-').reverse().join('/'):s;
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
const parseMoney=(raw:string)=>{
 const v=raw.trim().replace(/\s/g,'');
 if(!v)return NaN;
 const normalized=v.includes(',')?v.replace(/\./g,'').replace(',','.'):v;
 const n=Number(normalized);
 return Number.isFinite(n)&&n>0&&n<=100000000&&Math.abs(n*100-Math.round(n*100))<.000001?n:NaN;
};
const input:CSSProperties={width:'100%',marginTop:5,padding:'10px 11px',minHeight:41,
 borderRadius:9,border:'1px solid #aac8ea',background:'#fff',color:'#143f77',fontSize:13};
const button:CSSProperties={background:'#175eb9',border:'1px solid #1252a6',
 color:'#fff',fontSize:13,fontWeight:750,borderRadius:9,padding:'10px 15px',cursor:'pointer'};
const secondary:CSSProperties={...button,background:'#e9f2ff',borderColor:'#b1ccec',color:'#16508b'};
const label:CSSProperties={fontSize:12,fontWeight:700,color:'#1f548b'};

export default function ServiceFinance({
 proposalId,clientId,institution,proposalTitle,proposalTotal,onClose,onSaved
}:{
 proposalId:string;clientId:string;institution:string;proposalTitle:string;proposalTotal:number;
 onClose:()=>void;onSaved:(data:FinanceData)=>void;
}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [data,setData]=useState<FinanceData|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [description,setDescription]=useState('Apresentação de planetário — '+proposalTitle);
 const [total,setTotal]=useState(String(proposalTotal));
 const [due,setDue]=useState(today());
 const [selected,setSelected]=useState('');
 const [amount,setAmount]=useState('');
 const [paidOn,setPaidOn]=useState(today());
 const [pending,setPending]=useState<Pending|null>(null);
 const [requestId,setRequestId]=useState<string|null>(null);

 const titles=(data?.titles||[]).filter(t=>t.client_id===clientId&&t.proposal_id===proposalId);
 const charged=titles.reduce((sum,t)=>sum+Number(t.total||0),0);
 const paid=titles.reduce((sum,t)=>sum+Number(t.paid||0),0);
 const outstanding=Math.max(0,charged-paid);
 const dueTitles=titles.filter(t=>Math.max(0,Number(t.total)-Number(t.paid))>.009);
 const selectedTitle=dueTitles.find(t=>t.id===selected)||dueTitles[0];
 const writeOk=data?.writesEnabled===true&&!data?.limited;

 async function reload(){
  const response=await fetch('/api/financeiro/receber',{cache:'no-store'});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'Consulta financeira indisponível.');
  if(!Array.isArray(result.titles)||!Array.isArray(result.payments))
   throw Error('Consulta financeira incompleta. Nenhum lançamento será realizado.');
  const view:FinanceData={titles:result.titles,payments:result.payments,
   writesEnabled:result.writesEnabled===true,limited:result.limited===true};
  setData(view);onSaved(view);
  return view;
 }
 useEffect(()=>{
  const element=dialog.current;
  if(element&&!element.open)element.showModal();
  let live=true;
  void(async()=>{
   try{
    const response=await fetch('/api/financeiro/receber',{cache:'no-store'});
    const result=await response.json();
    if(!response.ok)throw Error(result.error||'Não foi possível consultar o Financeiro.');
    if(!Array.isArray(result.titles)||!Array.isArray(result.payments))
     throw Error('Informações financeiras incompletas.');
    if(live)setData({titles:result.titles,payments:result.payments,
     writesEnabled:result.writesEnabled===true,limited:result.limited===true});
   }catch(e){if(live)setError(e instanceof Error?e.message:'Financeiro indisponível.');}
   finally{if(live)setLoading(false);}
  })();
  return()=>{live=false;if(element?.open)element.close();};
 },[proposalId,clientId]);

 function requestCharge(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!writeOk||busy||pending)return;
  const value=parseMoney(total);
  if(!Number.isFinite(value)||description.trim().length<2||description.length>300||
     !/^\d{4}-\d{2}-\d{2}$/.test(due)){
   setError('Confira a descrição, o valor e o vencimento da cobrança.');return;
  }
  setError('');setPending({kind:'create',id:requestId||crypto.randomUUID(),
   amount:value,description:description.trim(),due});
 }
 function requestPayment(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!writeOk||busy||pending||!selectedTitle)return;
  const value=parseMoney(amount);
  const balance=Math.max(0,Number(selectedTitle.total)-Number(selectedTitle.paid));
  if(!Number.isFinite(value)||value>balance+.00001||
     !/^\d{4}-\d{2}-\d{2}$/.test(paidOn)||paidOn>today()){
   setError('Confira o valor recebido e a data do pagamento. O valor não pode superar o saldo.');return;
  }
  setError('');setPending({kind:'pay',id:requestId||crypto.randomUUID(),receivableId:selectedTitle.id,
   description:selectedTitle.description,amount:value,paidOn});
 }
 async function confirm(){
  if(!pending||busy||!writeOk)return;
  const current=pending;
  setBusy(true);setError('');setNotice('');
  setRequestId(current.id);
  try{
   const payload=current.kind==='create'
    ?{action:'create',id:current.id,client_id:clientId,proposal_id:proposalId,
       description:current.description,total:current.amount,due_on:current.due}
    :{action:'pay',id:current.id,receivable_id:current.receivableId,amount:current.amount,paid_on:current.paidOn};
   const response=await fetch('/api/financeiro/receber',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Operação financeira não concluída.');
   const fresh=await reload();
   if(!fresh.titles.some(t=>t.proposal_id===proposalId&&t.client_id===clientId))
    throw Error('Lançamento enviado, mas ainda não foi confirmado na consulta. Verifique o Financeiro antes de tentar novamente.');
   setPending(null);setRequestId(null);setAmount('');
   setNotice(current.kind==='create'?
    'Conta a receber cadastrada. Nenhum pagamento foi registrado.':
    result.alreadyExists?'Recebimento já existente; não houve duplicação.':'Pagamento registrado no caixa e na instituição.');
  }catch(e){
   setError((e instanceof Error?e.message:'Não foi possível concluir.')+
    ' Confira o extrato antes de repetir o lançamento.');
  }finally{setBusy(false);}
 }
 function close(){
  if(busy)return;
  if(pending){setPending(null);return;}
  onClose();
 }

 return <dialog ref={dialog} aria-labelledby="service-finance-title"
  onCancel={e=>{e.preventDefault();close();}}
  style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',margin:0,
   width:'min(100% - 24px,700px)',maxHeight:'90dvh',overflowY:'auto',padding:0,
   border:0,borderRadius:16,background:'#f9fbff',color:'#173b73',
   boxShadow:'0 22px 70px #061b4685'}}>
  <header style={{background:'linear-gradient(110deg,#10336e,#2376d3)',padding:'17px 20px',
   color:'#fff',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
   <div style={{display:'flex',alignItems:'center',gap:10}}>
    <Wallet size={23} aria-hidden="true"/>
    <div><small style={{fontWeight:700,opacity:.8}}>CENTRAL DE ATENDIMENTO</small>
     <h2 id="service-finance-title" style={{fontSize:21,margin:0,color:'#fff'}}>Financeiro da instituição</h2>
    </div>
   </div>
   <button type="button" disabled={busy} onClick={close} aria-label="Fechar Financeiro"
    style={{...secondary,padding:8}}><X size={18}/></button>
  </header>
  <div style={{padding:19,display:'grid',gap:15}}>
   <div style={{padding:13,background:'#eaf3ff',border:'1px solid #c6dcf7',borderRadius:10}}>
    <strong>{institution}</strong>
    <p style={{margin:'5px 0 0',fontSize:12}}>{proposalTitle} · Proposta {fmt(proposalTotal)}</p>
   </div>
   {loading&&<p role="status">Consultando cobranças e recebimentos existentes...</p>}
   {error&&<p role="alert" style={{margin:0,padding:11,border:'1px solid #fecaca',
    background:'#fff1f2',color:'#9d1237',borderRadius:9}}>{error}</p>}
   {notice&&<p role="status" style={{margin:0,padding:11,border:'1px solid #b9e5cc',
    background:'#f0fdf4',color:'#19633b',borderRadius:9}}>{notice}</p>}
   {data&&<>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:9}}>
     {([{name:'Cobrado',value:charged},{name:'Recebido',value:paid},{name:'Pendente',value:outstanding}]).map(v=>
      <div key={v.name} style={{padding:12,border:'1px solid #ccdcf1',borderRadius:10,background:'#eef5ff'}}>
       <div style={{fontSize:12,fontWeight:700,color:'#386597'}}>{v.name}</div>
       <strong style={{display:'block',fontSize:20,marginTop:4,color:'#124985'}}>{fmt(v.value)}</strong>
      </div>)}
    </div>
    <p style={{margin:0,fontSize:12,color:'#506f98'}}>Somente cobranças vinculadas a esta proposta aparecem aqui. O valor da proposta não representa pagamento recebido.</p>
    {data.limited&&<p role="alert" style={{margin:0,padding:10,border:'1px solid #efce9c',background:'#fff7e8',borderRadius:8,fontSize:12}}>
     O extrato possui mais registros do que esta consulta exibe. Para evitar cobranças duplicadas, novas gravações estão bloqueadas nesta janela.
    </p>}
    {titles.length>0&&<section style={{display:'grid',gap:9}}>
     <strong style={{fontSize:14}}>Cobranças cadastradas</strong>
     {titles.map(t=><div key={t.id} style={{border:'1px solid #ccdef5',borderRadius:9,padding:12,background:'#fff',display:'grid',gap:5}}>
      <strong style={{fontSize:12}}>{t.description}</strong>
      <div style={{fontSize:12,color:'#4b709e'}}>Vencimento: {dateBR(t.due_on)} · Total: {fmt(Number(t.total))}</div>
      <div style={{fontSize:12,color:'#14528f'}}>Recebido: {fmt(Number(t.paid))} · Pendente: {fmt(Math.max(0,Number(t.total)-Number(t.paid)))}</div>
     </div>)}
    </section>}
    {titles.length===0&&<p style={{margin:0,fontSize:13,color:'#3d5f88'}}>Ainda não existe uma cobrança vinculada a esta proposta.</p>}
    {writeOk&&titles.length===0&&!pending&&<form onSubmit={requestCharge} style={{display:'grid',gap:10}}>
     <strong style={{fontSize:14}}>Registrar conta a receber</strong>
     <label style={label}>Descrição
      <input required maxLength={300} value={description} onChange={e=>{setDescription(e.target.value);setRequestId(null);}} style={input}/>
     </label>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
      <label style={label}>Valor a cobrar (R$)
       <input required inputMode="decimal" value={total} onChange={e=>{setTotal(e.target.value);setRequestId(null);}} style={input}/>
      </label>
      <label style={label}>Vencimento
       <input required type="date" value={due} onChange={e=>{setDue(e.target.value);setRequestId(null);}} style={input}/>
      </label>
     </div>
     <button type="submit" disabled={busy} style={button}>Registrar cobrança</button>
     <p style={{margin:0,fontSize:12,color:'#54729a'}}>Isso não registra pagamento nem altera a proposta.</p>
    </form>}
    {writeOk&&dueTitles.length>0&&!pending&&<form onSubmit={requestPayment} style={{display:'grid',gap:10}}>
     <strong style={{fontSize:14}}>Registrar pagamento recebido</strong>
     <label style={label}>Cobrança
      <select value={selectedTitle?.id||''} onChange={e=>{setSelected(e.target.value);setAmount('');setRequestId(null);}} style={input}>
       {dueTitles.map(t=><option key={t.id} value={t.id}>{t.description} · Saldo {fmt(Math.max(0,Number(t.total)-Number(t.paid)))}</option>)}
      </select>
     </label>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
      <label style={label}>Valor efetivamente recebido (R$)
       <input required inputMode="decimal" value={amount} onChange={e=>{setAmount(e.target.value);setRequestId(null);}} style={input} placeholder="0,00"/>
      </label>
      <label style={label}>Data do recebimento
       <input required type="date" max={today()} value={paidOn} onChange={e=>{setPaidOn(e.target.value);setRequestId(null);}} style={input}/>
      </label>
     </div>
     <button type="submit" disabled={busy} style={button}><ReceiptText size={16} style={{verticalAlign:'middle',marginRight:7}}/>Registrar recebimento</button>
    </form>}
    {titles.length>0&&dueTitles.length===0&&<div role="status" style={{padding:12,borderRadius:9,background:'#eafaf0',
      border:'1px solid #b8e8ca',color:'#176338',fontSize:13}}>
      <CheckCircle2 size={17} style={{display:'inline',verticalAlign:'middle',marginRight:7}}/>Cobranças vinculadas a esta proposta quitadas.
     </div>}
    {!data.writesEnabled&&<p role="status" style={{margin:0,fontSize:12,color:'#7b5423'}}>Gravações financeiras indisponíveis. Consulta permitida.</p>}
   </>}
   {pending&&<div role="group" aria-label="Confirmação financeira" style={{padding:15,background:'#fff7e6',
    border:'1px solid #e9bd79',borderRadius:12,display:'grid',gap:10}}>
    <strong style={{fontSize:16}}>{pending.kind==='create'?'Confirmar cobrança':'Confirmar recebimento real'}</strong>
    <p style={{margin:0,fontSize:13}}>
     {pending.kind==='create'
      ?'Criar uma conta a receber de '+fmt(pending.amount)+' com vencimento em '+dateBR(pending.due)+'. Nenhuma receita será lançada no caixa agora.'
      :'Registrar '+fmt(pending.amount)+' como dinheiro efetivamente recebido em '+dateBR(pending.paidOn)+'. O pagamento será lançado no caixa geral.'}
    </p>
    <div style={{display:'flex',justifyContent:'flex-end',gap:9,flexWrap:'wrap'}}>
     <button type="button" disabled={busy} onClick={()=>setPending(null)} style={secondary}>Voltar</button>
     <button type="button" disabled={busy} onClick={()=>void confirm()} style={button}>{busy?'Registrando...':'Confirmar registro'}</button>
    </div>
   </div>}
   <div style={{display:'flex',justifyContent:'flex-end'}}>
    <button type="button" disabled={busy} onClick={close} style={secondary}>Fechar</button>
   </div>
  </div>
 </dialog>;
}
