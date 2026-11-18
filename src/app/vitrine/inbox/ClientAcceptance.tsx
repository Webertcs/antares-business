'use client';

import {useEffect,useRef,useState} from 'react';
import {CheckCircle2,ClipboardCheck,X} from 'lucide-react';
import styles from './composer.module.css';

type Props={proposalId:string;institution:string;onClose:()=>void;onSaved:()=>void};
type Channel='whatsapp'|'written'|'verbal';

export default function ClientAcceptance({proposalId,institution,onClose,onSaved}:Props){
 const dialogRef=useRef<HTMLDialogElement>(null);
 const [channel,setChannel]=useState<Channel>('whatsapp');
 const [evidence,setEvidence]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');

 useEffect(()=>{
  const dialog=dialogRef.current;
  if(dialog&&!dialog.open)dialog.showModal();
  return ()=>{if(dialog?.open)dialog.close();};
 },[]);

 async function save(){
  if(busy||evidence.trim().length<10||evidence.trim().length>500)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/vitrine/proposta/aceite',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({id:proposalId,channel,evidence:evidence.trim()})
   });
   const data=await response.json();
   if(!response.ok||data.status!=='accepted')throw Error(data.error||'Não foi possível registrar o aceite.');
   onSaved();
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível registrar o aceite.');}
  finally{setBusy(false);}
 }

 return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="client-acceptance-title"
  onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
  <header className={styles.header}>
   <span className={styles.icon}><ClipboardCheck size={24} aria-hidden="true"/></span>
   <div className={styles.heading}><small>ANTARES BUSINESS · CONFIRMAÇÃO DA ESCOLA</small>
    <h2 id="client-acceptance-title">Registrar aceite da escola</h2></div>
   <button type="button" className={styles.close} disabled={busy} aria-label="Fechar" onClick={onClose}><X size={20}/></button>
  </header>
  <div className={styles.content}>
   <section className={styles.school}><div><small>Instituição</small><strong>{institution}</strong></div></section>
   {error&&<p className={styles.error} role="alert">{error}</p>}
   <div className={styles.field}>
    <label htmlFor="accept-channel">Canal da confirmação</label>
    <select id="accept-channel" value={channel} disabled={busy} onChange={e=>setChannel(e.target.value as Channel)}>
     <option value="whatsapp">WhatsApp</option>
     <option value="written">E-mail ou documento</option>
     <option value="verbal">Confirmação verbal</option>
    </select>
   </div>
   <div className={styles.field} style={{marginTop:14}}>
    <label htmlFor="accept-evidence">Registro da confirmação (mínimo 10 caracteres)</label>
    <textarea id="accept-evidence" rows={3} maxLength={500} disabled={busy}
     placeholder="Ex.: direção confirmou a proposta por WhatsApp em 14/11/2026"
     value={evidence} onChange={e=>setEvidence(e.target.value)}/>
   </div>
  </div>
  <footer className={styles.footer}>
   <button type="button" className={styles.secondary} disabled={busy} onClick={onClose}>Cancelar</button>
   <button type="button" className={styles.approveButton}
    disabled={busy||evidence.trim().length<10||evidence.trim().length>500}
    onClick={()=>void save()}><CheckCircle2 size={17}/>{busy?'Registrando...':'Registrar aceite'}</button>
  </footer>
 </dialog>;
}
