'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import {CalendarDays,X} from 'lucide-react';
import styles from './composer.module.css';

type Props={
 proposalId:string;
 institution:string;
 previousValidUntil:string|null;
 onClose:()=>void;
 onSaved:()=>void;
};
const asBR=(value:string|null)=>value?value.slice(0,10).split('-').reverse().join('/'):'Não informada';

export default function RenewValidity({proposalId,institution,previousValidUntil,onClose,onSaved}:Props){
 const dialogRef=useRef<HTMLDialogElement>(null);
 const [newDate,setNewDate]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});

 useEffect(()=>{
  const dialog=dialogRef.current;
  if(dialog&&!dialog.open)dialog.showModal();
  return()=>{if(dialog?.open)dialog.close();};
 },[]);

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(busy)return;
  if(!newDate||newDate<today||(previousValidUntil&&newDate<=previousValidUntil)){
   setError('Escolha uma validade futura e posterior à validade anterior.');
   return;
  }
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/vitrine/proposta',{
    method:'PUT',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({id:proposalId,validUntil:newDate})
   });
   const data=await response.json();
   if(!response.ok||!data.ok)throw Error(data.error||'Não foi possível renovar a proposta.');
   onSaved();
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível renovar a proposta.');}
  finally{setBusy(false);}
 }

 return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="renew-validity-title"
  onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
  <header className={styles.header}>
   <span className={styles.icon}><CalendarDays size={24} aria-hidden="true"/></span>
   <div className={styles.heading}><small>ANTARES BUSINESS · PROPOSTAS</small>
    <h2 id="renew-validity-title">Renovar validade</h2></div>
   <button type="button" className={styles.close} disabled={busy} aria-label="Fechar" onClick={onClose}><X size={20}/></button>
  </header>
  <div className={styles.content}>
   <section className={styles.school}>
    <div><small>Instituição</small><strong>{institution}</strong></div>
   </section>
   <p className={styles.note}>Validade anterior: <strong>{asBR(previousValidUntil)}</strong></p>
   {error&&<p className={styles.error} role="alert">{error}</p>}
   <form id="renew-validity-form" onSubmit={e=>void submit(e)}>
    <div className={styles.field}>
     <label htmlFor="renew-validity-date">Nova validade</label>
     <input id="renew-validity-date" type="date" min={today} required disabled={busy}
      value={newDate} onChange={e=>setNewDate(e.target.value)}/>
    </div>
   </form>
   <p className={styles.note}>A renovação ficará registrada. O aceite da escola deverá ser confirmado separadamente.</p>
  </div>
  <footer className={styles.footer}>
   <button type="button" className={styles.secondary} disabled={busy} onClick={onClose}>Cancelar</button>
   <button type="submit" form="renew-validity-form" className={styles.approveButton} disabled={busy||!newDate}>
    <CalendarDays size={17}/>{busy?'Salvando...':'Confirmar renovação'}
   </button>
  </footer>
 </dialog>;
}
