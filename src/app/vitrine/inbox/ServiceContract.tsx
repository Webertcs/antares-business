'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import ContractDraftEditor from './ContractDraftEditor';
import {FileCheck2,X} from 'lucide-react';

export type CentralContract={
 id:string;proposal_id:string;confirmation_mode:string;
 status:string;confirmed_at:string|null;
};
export type CentralContractProposal={
 id:string;client_id:string;title:string;total:number;
 expected_attendees:number|null;status:string;from_vitrine:boolean;
 client_accepted_at:string|null
};
export type CentralContractData={
 proposals:CentralContractProposal[];contracts:CentralContract[];
 unavailable?:string[]
};

const amount=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
const field:React.CSSProperties={display:'block',width:'100%',minHeight:42,padding:'10px 12px',
 border:'1px solid #abc7ed',borderRadius:9,color:'#16325b',background:'#fff',marginTop:5};
const button:React.CSSProperties={padding:'10px 15px',borderRadius:9,
 border:'1px solid #174987',background:'#155cc1',color:'white',fontWeight:750,cursor:'pointer'};
const secondary:React.CSSProperties={...button,background:'#e8f2ff',color:'#174987',borderColor:'#adc8eb'};

export default function ServiceContract({
 proposalId,institution,enabled,onClose,onSaved
}:{
 proposalId:string;institution:string;enabled:boolean;onClose:()=>void;onSaved:()=>void;
}){
 const ref=useRef<HTMLDialogElement>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [data,setData]=useState<CentralContractData|null>(null);
 const [mode,setMode]=useState<'written'|'verbal'|'whatsapp'>('written');
 const [terms,setTerms]=useState('');
 const [error,setError]=useState('');
 const [editingDocument,setEditingDocument]=useState(false);

 useEffect(()=>{
  const current=ref.current;
  if(current&&!current.open)current.showModal();
  let active=true;
  void (async()=>{
   try{
    const res=await fetch('/api/business',{cache:'no-store'});
    const json=await res.json();
    if(!res.ok)throw Error(json.error||'Contratos indisponíveis.');
    if(!Array.isArray(json.proposals)||!Array.isArray(json.contracts)||
       json.unavailable?.includes('proposals')||json.unavailable?.includes('contracts'))
     throw Error('Consulta de propostas ou contratos incompleta.');
    if(!active)return;
    const proposal=(json.proposals as CentralContractProposal[]).find(p=>p.id===proposalId);
    if(!proposal)throw Error('Proposta não encontrada na instituição.');
    setData(json as CentralContractData);
    if((json.contracts as CentralContract[]).some(c=>c.proposal_id===proposalId))setEditingDocument(true);
    const n=Number(proposal.expected_attendees||0);
    setTerms([
     'Serviço: '+proposal.title,
     'Valor da proposta: '+amount(Number(proposal.total||0)),
     ...(n>0?['Público previsto: '+n+' participantes']:[])
    ].join('\n'));
   }catch(e){if(active)setError(e instanceof Error?e.message:'Não foi possível carregar o contrato.');}
   finally{if(active)setLoading(false);}
  })();
  return()=>{active=false;if(current?.open)current.close();};
 },[proposalId]);

 const proposal=data?.proposals.find(p=>p.id===proposalId);
 const contract=data?.contracts.find(c=>c.proposal_id===proposalId);
 const accepted=Boolean(proposal&&(!proposal.from_vitrine||proposal.client_accepted_at));
 const canSave=enabled&&accepted&&!busy&&!contract&&terms.trim().length>=8&&terms.length<=8000;

 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!canSave){setError('Confira a confirmação da proposta e as condições comerciais.');return;}
  setBusy(true);setError('');
  try{
   const res=await fetch('/api/clientes/comercial',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'contract',proposalId,mode,terms:terms.trim()})
   });
   const json=await res.json();
   if(!res.ok)throw Error(json.error||'Contrato não registrado.');
   onSaved();
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível registrar o contrato.');}
  finally{setBusy(false);}
 }

 return <dialog ref={ref} aria-labelledby="central-contract-title"
  onCancel={e=>{e.preventDefault();if(!busy&&!editingDocument)onClose();}}
  style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%, -50%)',margin:0,
   width:editingDocument?'min(100% - 24px,850px)':'min(100% - 24px,570px)',maxHeight:'90dvh',overflowY:'auto',
   padding:0,border:0,borderRadius:17,color:'#173d77',background:'#f9fbff',
   boxShadow:'0 25px 70px #071c4990'}}>
  <header style={{padding:'17px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',
   gap:12,background:'linear-gradient(110deg,#10336e,#2376d3)',color:'#fff'}}>
   <div style={{display:'flex',alignItems:'center',gap:10}}>
    <FileCheck2 size={24}/>
    <div><small style={{opacity:.8,fontWeight:750}}>CENTRAL DE ATENDIMENTO</small>
     <h2 id="central-contract-title" style={{margin:0,fontSize:20,color:'#fff'}}>{editingDocument?'Elaborar documento':'Contrato opcional'}</h2>
    </div>
   </div>
   <button type="button" disabled={busy||editingDocument} aria-label="Fechar contrato" onClick={onClose}
    style={{...secondary,padding:8}}><X size={18}/></button>
  </header>
  <div style={{padding:20,display:'grid',gap:14}}>
   {editingDocument&&contract&&proposal?<ContractDraftEditor
     key={contract.id}
     contractId={contract.id}
     clientId={proposal.client_id}
     proposal={proposal}
     institution={institution}
     responsible=""
     onClose={()=>setEditingDocument(false)}
   />:<>
   <div style={{padding:13,background:'#e9f2ff',border:'1px solid #c8dcf7',borderRadius:11}}>
    <strong>{institution}</strong>
    <p style={{margin:'6px 0 0',fontSize:12}}>O contrato escrito não é necessário para reservar a cúpula.</p>
   </div>
   {loading&&<p role="status">Consultando a proposta e os contratos...</p>}
   {error&&<p role="alert" style={{margin:0,padding:10,background:'#fff1f2',
    border:'1px solid #fecdd3',borderRadius:8,color:'#9f1239'}}>{error}</p>}
   {!loading&&contract&&<div style={{display:'grid',gap:10}}>
    <strong>Contrato já cadastrado</strong>
    <p style={{margin:0,fontSize:13}}>Situação: {contract.status==='confirmed'?'Confirmado':contract.status==='pending'?'Pendente de confirmação':contract.status}</p>
    <p style={{margin:0,fontSize:13}}>Modalidade: {contract.confirmation_mode==='written'?'Formal por escrito':contract.confirmation_mode==='verbal'?'Verbal':'WhatsApp'}</p>
    <p style={{margin:0,fontSize:12,color:'#496a97'}}>O cadastro não substitui a confirmação real do cliente.</p>
    {proposal?.client_id&&<button type="button" onClick={()=>setEditingDocument(true)} style={button}>Elaborar documento</button>}
   </div>}
   {!loading&&!contract&&proposal&&accepted&&<form onSubmit={e=>void save(e)} style={{display:'grid',gap:13}}>
    <label style={{fontSize:13,fontWeight:750}}>Proposta aceita
     <div style={{...field,background:'#eaf3ff'}}>{proposal.title} · {amount(Number(proposal.total||0))}</div>
    </label>
    <label style={{fontSize:13,fontWeight:750}}>Modalidade
     <select value={mode} disabled={!enabled||busy} onChange={e=>setMode(e.target.value as 'written'|'verbal'|'whatsapp')} style={field}>
      <option value="written">Formal por escrito</option>
      <option value="verbal">Acordo verbal</option>
      <option value="whatsapp">WhatsApp</option>
     </select>
    </label>
    <label style={{fontSize:13,fontWeight:750}}>Condições do acordo
     <textarea required minLength={8} maxLength={8000} rows={5} disabled={!enabled||busy}
      value={terms} onChange={e=>setTerms(e.target.value)} style={field}/>
    </label>
    <p style={{margin:0,fontSize:12,color:'#496a97'}}>Os dados comerciais foram aproveitados da proposta. Revise e registre somente as condições realmente acordadas. Salvar não confirma o contrato nem cria reserva.</p>
    {!enabled&&<p role="status">Cadastro de contratos indisponível no momento.</p>}
    <div style={{display:'flex',justifyContent:'flex-end',gap:9,flexWrap:'wrap'}}>
     <button type="button" disabled={busy} onClick={onClose} style={secondary}>Cancelar</button>
     <button type="submit" disabled={!canSave} style={{...button,opacity:canSave?1:.5}}>
      {busy?'Salvando...':'Salvar contrato'}
     </button>
    </div>
   </form>}
   {!loading&&!contract&&(!proposal||!accepted)&&<p role="alert">Registre primeiro o aceite verdadeiro da proposta.</p>}
   {(!proposal||contract)&&<button type="button" disabled={busy} onClick={onClose} style={secondary}>Fechar</button>}
   </>}
  </div>
 </dialog>;
}
