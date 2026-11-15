'use client';

import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';

type Dome={id:string;name:string;code:string|null;capacity:number|null;active:boolean;mapped:boolean};
type Action='update'|'activate'|'deactivate'|'delete';

export default function GerenciarCupula({dome,enabled}:{dome:Dome;enabled:boolean}){
 const router=useRouter(),trigger=useRef<HTMLButtonElement>(null),first=useRef<HTMLInputElement>(null);
 const [open,setOpen]=useState(false),[name,setName]=useState(dome.name),[code,setCode]=useState(dome.code||''),[capacity,setCapacity]=useState(String(dome.capacity||30)),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[confirmText,setConfirmText]=useState('');
 const valid=name.trim().length>=2&&name.length<=100&&code.trim().length>=1&&code.length<=30&&Number.isInteger(Number(capacity))&&Number(capacity)>0&&Number(capacity)<=500;
 useEffect(()=>{if(!open)return;first.current?.focus();const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy){setOpen(false);trigger.current?.focus()}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[open,busy]);
 async function apply(action:Action){
  if(busy||!enabled||(action==='update'&&!valid)||(action==='delete'&&confirmText!=='EXCLUIR'))return;
  setBusy(true);setMessage('');
  try{
   const response=await fetch('/api/agenda/cupulas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    domeId:dome.id,action,name:name.trim(),code:code.trim(),capacity:Number(capacity),confirm:action==='delete'?confirmText:undefined
   })});
   const body=await response.json();
   if(!response.ok)throw new Error(body.error||'Não foi possível atualizar a cúpula.');
   setOpen(false);setConfirmText('');setMessage(action==='delete'?'Cúpula excluída.':'Cúpula atualizada.');router.refresh();window.dispatchEvent(new Event('antares:cupulas-atualizadas'));
  }catch(e){setMessage(e instanceof Error?e.message:'Operação recusada.')}
  finally{setBusy(false)}
 }
 return <div className="dome-manage">
  <button ref={trigger} type="button" className="dome-manage-trigger" onClick={()=>{setOpen(true);setMessage('')}}>Gerenciar</button>
  {open&&<div className="dome-create-overlay" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setOpen(false)}}>
   <section role="dialog" aria-modal="true" aria-label={'Gerenciar '+dome.name} className="dome-manage-modal">
    <div className="dome-create-title"><strong>Gerenciar cúpula</strong><button type="button" onClick={()=>setOpen(false)} disabled={busy} aria-label="Fechar">×</button></div>
    <p className="dome-manage-hint">Atualize as informações ou altere a disponibilidade da cúpula.</p>
    <div className="dome-manage-fields">
     <label>Nome<input ref={first} value={name} maxLength={100} onChange={e=>setName(e.target.value)} /></label>
     <label>Código<input value={code} maxLength={30} onChange={e=>setCode(e.target.value)} /></label>
     <label>Capacidade por sessão<input type="number" min={1} max={500} value={capacity} onChange={e=>setCapacity(e.target.value)}/></label>
    </div>
    {!enabled&&<p className="dome-create-notice">Alterações indisponíveis até a liberação segura da Agenda.</p>}
    <div className="dome-manage-actions">
     <button type="button" disabled={!enabled||!valid||busy} onClick={()=>apply('update')}>Salvar alterações</button>
     <button type="button" disabled={!enabled||busy} onClick={()=>apply(dome.active?'deactivate':'activate')}>{dome.active?'Desativar':'Reativar'}</button>
    </div>
    <div className="dome-manage-danger">
     <strong>Excluir cúpula sem histórico</strong>
     <p>Exclusão permanente somente para cúpulas sem apresentações vinculadas. Se já foi utilizada, desative-a para preservar o histórico.</p>
     <label>Digite EXCLUIR para confirmar<input value={confirmText} onChange={e=>setConfirmText(e.target.value)} placeholder="EXCLUIR" autoComplete="off" /></label>
     <button type="button" disabled={!enabled||busy||confirmText!=='EXCLUIR'} onClick={()=>apply('delete')}>Excluir definitivamente</button>
    </div>
    {message&&<p role="alert" className="dome-create-message">{message}</p>}
   </section>
  </div>}
  {message&&!open&&<span role="status" className="dome-create-message">{message}</span>}
 </div>;
}
