'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {CheckCircle2,FileText,Info,Save,ShieldCheck,X} from 'lucide-react';
import styles from './composer.module.css';

type Model='per_student'|'fixed'|'complimentary';
type Lead={
 id:string;institution:string;responsible_name:string;city:string;
 audience:string;attendees:number|null;desired_date:string|null;
 converted_proposal_id:string|null;
};
type Proposal={
 id:string;status:string;pricing_model:string;expected_attendees:number;
 unit_price:number;fixed_price:number;discount:number;deposit:number;
 total:number;valid_until:string|null;payment_terms:string;
};
type Props={
 lead:Lead;existingClientId:string|null;onClose:()=>void;onSaved:()=>void;
};
const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const cents=(n:number)=>Math.round(n*100)/100;
const positive=(n:number)=>Number.isFinite(n)&&n>=0&&n<=10000000&&Math.abs(n*100-Math.round(n*100))<0.000001;
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export default function ProposalComposer({lead,existingClientId,onClose,onSaved}:Props){
 const dialogRef=useRef<HTMLDialogElement>(null);
 const [proposalId,setProposalId]=useState<string|null>(lead.converted_proposal_id);
 const [status,setStatus]=useState('draft');
 const [loading,setLoading]=useState(Boolean(lead.converted_proposal_id));
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const [dirty,setDirty]=useState(false);
 const [saved,setSaved]=useState(false);
 const [confirmDiscard,setConfirmDiscard]=useState(false);
 const [model,setModel]=useState<Model>('per_student');
 const [attendees,setAttendees]=useState(lead.attendees??0);
 const [unit,setUnit]=useState(0);
 const [fixed,setFixed]=useState(0);
 const [discount,setDiscount]=useState(0);
 const [deposit,setDeposit]=useState(0);
 const [validUntil,setValidUntil]=useState('');
 const [terms,setTerms]=useState('');

 useEffect(()=>{
  const dialog=dialogRef.current;
  if(dialog&&!dialog.open)dialog.showModal();
  return ()=>{if(dialog?.open)dialog.close();};
 },[]);

 useEffect(()=>{
  if(!lead.converted_proposal_id)return;
  let live=true;
  async function load(){
   try{
    const response=await fetch('/api/vitrine/proposta?id='+encodeURIComponent(lead.converted_proposal_id||''),{cache:'no-store'});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||'Falha ao carregar proposta.');
    const p=data.proposal as Proposal;
    if(!live)return;
    setStatus(p.status);
    setModel((['per_student','fixed','complimentary'].includes(p.pricing_model)?p.pricing_model:'per_student') as Model);
    setAttendees(p.expected_attendees??0);
    setUnit(Number(p.unit_price)||0);
    setFixed(Number(p.fixed_price)||0);
    setDiscount(Number(p.discount)||0);
    setDeposit(Number(p.deposit)||0);
    setValidUntil(p.valid_until||'');
    setTerms(p.payment_terms||'');
   }catch(e){if(live)setError(e instanceof Error?e.message:'Não foi possível carregar.');}
   finally{if(live)setLoading(false);}
  }
  void load();
  return ()=>{live=false;};
 },[lead.converted_proposal_id]);

 const gross=useMemo(()=>model==='per_student'?attendees*unit:model==='fixed'?fixed:0,[model,attendees,unit,fixed]);
 const total=useMemo(()=>Math.max(0,cents(gross-discount)),[gross,discount]);
 const valid=Number.isInteger(attendees)&&attendees>=0&&attendees<=100000&&
  [unit,fixed,discount,deposit].every(positive)&&positive(gross)&&
  discount<=gross&&deposit<=total&&terms.length<=2000;
 const mark=()=>{setDirty(true);setSaved(false);setNotice('');};
 const blocked=loading||busy||Boolean(error)||status!=='draft';
 const requestClose=()=>{if(busy)return;if(dirty&&!saved){setConfirmDiscard(true);return;}onClose();};

 async function post(url:string,body:object){
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Não foi possível salvar.');
  return data;
 }

 async function save(){
  if(blocked||!valid)return;
  setBusy(true);setError('');setNotice('');
  let id=proposalId;
  let created=false;
  try{
   if(!id){
    const converted=await post('/api/vitrine/convert',{id:lead.id,existingClientId});
    if(typeof converted.proposalId!=='string'||!uuid.test(converted.proposalId)){
     throw Error('O pedido foi convertido, mas não foi possível localizar a proposta. Feche e reabra Oportunidades.');
    }
    id=converted.proposalId;
    setProposalId(id);
    created=true;
   }
   await post('/api/vitrine/proposta',{
    id,model,attendees,unit:cents(unit),fixed:cents(fixed),
    discount:cents(discount),deposit:cents(deposit)
   });
   await post('/api/vitrine/proposta/aprovar',{
    id,valid:validUntil||null,terms:terms.trim(),approve:false
   });
   setDirty(false);setSaved(true);
   setNotice('Rascunho salvo com sucesso. Você pode voltar e editar quando quiser.');
   onSaved();
  }catch(e){
   setError((created?'O cliente e o rascunho foram criados, mas faltou concluir o salvamento. ':'')+
    (e instanceof Error?e.message:'Erro ao salvar. Tente novamente.'));
   if(created)onSaved();
  }finally{setBusy(false);}
 }

 return <dialog ref={dialogRef} className={styles.dialog}
  aria-labelledby="composer-title"
  onCancel={e=>{e.preventDefault();requestClose();}}>
  <header className={styles.header}>
   <span className={styles.icon}><FileText size={24}/></span>
   <div className={styles.heading}>
    <small>ANTARES BUSINESS · PROPOSTAS</small>
    <h2 id="composer-title">{proposalId?'Editar proposta':'Preparar proposta'}</h2>
   </div>
   <button type="button" className={styles.close} aria-label="Fechar formulário" onClick={requestClose} disabled={busy}><X size={20}/></button>
  </header>

  <div className={styles.content}>
   <section className={styles.school}>
    <div><small>Instituição solicitante</small><strong>{lead.institution}</strong>
     <span>Responsável: {lead.responsible_name} · {lead.city||'Cidade não informada'}</span>
    </div>
    <div className={styles.schoolAside}><small>Público</small><strong>{lead.audience}</strong></div>
   </section>

   {loading&&<p role="status" className={styles.note}>Carregando dados da proposta...</p>}
   {status!=='draft'&&!loading&&<p className={styles.note}>Esta proposta já saiu do rascunho. Para proteger os dados comerciais e reservas, a edição está bloqueada. Consulte o documento original.</p>}
   {error&&<p role="alert" className={styles.error}>{error}</p>}
   {notice&&<p role="status" className={styles.success}><CheckCircle2 size={17}/>{notice}</p>}

   <fieldset className={styles.fields} disabled={blocked}>
    <legend>Valores comerciais</legend>
    <div className={styles.field}>
     <label htmlFor="pc-model">Modelo de cobrança</label>
     <select id="pc-model" value={model} onChange={e=>{setModel(e.target.value as Model);mark();}}>
      <option value="per_student">Por aluno</option>
      <option value="fixed">Valor fechado</option>
      <option value="complimentary">Cortesia</option>
     </select>
    </div>
    <div className={styles.grid}>
     <div className={styles.field}><label htmlFor="pc-attendees">Participantes</label>
      <input id="pc-attendees" type="number" min="0" max="100000" step="1" value={attendees} onChange={e=>{setAttendees(e.target.value===''?NaN:Number(e.target.value));mark();}}/></div>
     {model==='per_student'&&<div className={styles.field}><label htmlFor="pc-unit">Preço por aluno (R$)</label>
      <input id="pc-unit" type="number" min="0" step="0.01" value={unit} onChange={e=>{setUnit(e.target.value===''?NaN:Number(e.target.value));mark();}}/></div>}
     {model==='fixed'&&<div className={styles.field}><label htmlFor="pc-fixed">Valor fechado (R$)</label>
      <input id="pc-fixed" type="number" min="0" step="0.01" value={fixed} onChange={e=>{setFixed(e.target.value===''?NaN:Number(e.target.value));mark();}}/></div>}
     <div className={styles.field}><label htmlFor="pc-discount">Desconto (R$)</label>
      <input id="pc-discount" type="number" min="0" step="0.01" value={discount} onChange={e=>{setDiscount(e.target.value===''?NaN:Number(e.target.value));mark();}}/></div>
     <div className={styles.field}><label htmlFor="pc-deposit">Sinal previsto (R$)</label>
      <input id="pc-deposit" type="number" min="0" step="0.01" value={deposit} onChange={e=>{setDeposit(e.target.value===''?NaN:Number(e.target.value));mark();}}/></div>
    </div>
    <div className={styles.total}><div><small>Total estimado</small><strong>{valid?money(total):'Confira os valores'}</strong></div>
     <div><small>Saldo após o sinal</small><strong>{valid?money(total-deposit):'—'}</strong></div></div>
    {!valid&&<p role="alert" className={styles.validation}>Confira os valores. Desconto não pode ultrapassar o total nem o sinal ultrapassar o saldo.</p>}

    <div className={styles.grid}>
     <div className={styles.field}><label htmlFor="pc-valid">Validade da proposta</label>
      <input id="pc-valid" type="date" value={validUntil} onChange={e=>{setValidUntil(e.target.value);mark();}}/></div>
     <div className={styles.field}><label htmlFor="pc-terms">Condições comerciais</label>
      <textarea id="pc-terms" rows={3} maxLength={2000} value={terms}
       placeholder="Ex.: Pagamento após o evento"
       onChange={e=>{setTerms(e.target.value);mark();}}/></div>
    </div>
   </fieldset>
   <p className={styles.safe}><ShieldCheck size={17}/>Salvar um rascunho não envia mensagens, não cria contratos, cobranças ou reservas.</p>
  </div>

  {confirmDiscard&&<div className={styles.discard} role="alertdialog" aria-label="Descartar alterações">
   <strong>Descartar alterações não salvas?</strong>
   <p>O último rascunho salvo permanecerá no sistema.</p>
   <div><button type="button" onClick={()=>setConfirmDiscard(false)}>Continuar editando</button>
    <button type="button" onClick={onClose}>Descartar e fechar</button></div>
  </div>}

  <footer className={styles.footer}>
   <button type="button" className={styles.secondary} onClick={requestClose} disabled={busy}>Fechar</button>
   {proposalId&&<Link className={styles.secondary} href={'/vitrine/proposta/'+proposalId}>Ver documento / PDF</Link>}
   {status==='draft'&&<button type="button" className={styles.primary}
    disabled={blocked||!valid||(!dirty&&saved)} onClick={()=>void save()}>
    <Save size={17}/>{busy?'Salvando...':'Salvar rascunho'}</button>}
   {status!=='draft'&&<span className={styles.locked}><Info size={15}/>Documento protegido</span>}
  </footer>
 </dialog>;
