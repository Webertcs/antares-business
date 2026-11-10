'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
export default function NovaCupula({enabled}:{enabled:boolean}){
 const router=useRouter();
 const nameInput=useRef<HTMLInputElement>(null);
 const trigger=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false),[name,setName]=useState(''),[code,setCode]=useState(''),[capacity,setCapacity]=useState('30'),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{if(!open)return;nameInput.current?.focus();function onKey(e:KeyboardEvent){if(e.key==='Escape'&&!saving){setOpen(false);trigger.current?.focus();}}window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[open,saving]);
 const valid=name.trim().length>=2&&name.length<=100&&code.trim().length>=1&&code.length<=30&&Number.isInteger(Number(capacity))&&Number(capacity)>=1&&Number(capacity)<=500;
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!enabled||!valid||saving)return;
  setSaving(true);setMessage('');
  try{
   const response=await fetch('/api/agenda/preparar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create-dome',name:name.trim(),code:code.trim(),capacity:Number(capacity)})});
   const body=await response.json();
   if(!response.ok)throw Error(body.error||'Não foi possível cadastrar a cúpula.');
   setOpen(false);setName('');setCode('');setCapacity('30');setMessage('Cúpula cadastrada e vinculada com sucesso.');router.refresh();window.dispatchEvent(new Event('antares:cupulas-atualizadas'));
  }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível salvar.');}
  finally{setSaving(false)}
 }
 return <div className="dome-create">
  <button ref={trigger} type="button" className="dome-create-toggle" onClick={()=>{setOpen(v=>!v);setMessage('')}} aria-expanded={open} aria-controls="dome-create-form">+ Nova cúpula</button>
  {open&&<div className="dome-create-overlay" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)setOpen(false)}}><form id="dome-create-form" role="dialog" aria-modal="true" aria-label="Nova cúpula" onSubmit={submit} className="dome-create-form"><div className="dome-create-title"><strong>Nova cúpula</strong><button type="button" aria-label="Fechar cadastro" disabled={saving} onClick={()=>setOpen(false)}>×</button></div>
   <label>Nome da cúpula<input ref={nameInput} required maxLength={100} minLength={2} value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Cúpula Principal"/></label>
   <label>Código<input required maxLength={30} value={code} onChange={e=>setCode(e.target.value)} placeholder="Ex.: CUP-01"/></label>
   <label>Capacidade por sessão<input required type="number" min={1} max={500} value={capacity} onChange={e=>setCapacity(e.target.value)}/></label>
   {!enabled&&<p className="dome-create-notice">Cadastro preparado para operação. A gravação será liberada após a validação final do ambiente e das permissões.</p>}
   <div className="dome-create-actions"><button type="button" onClick={()=>setOpen(false)}>Cancelar</button><button type="submit" disabled={!enabled||!valid||saving}>{saving?'Salvando...':'Cadastrar cúpula'}</button></div>
  </form></div>}
  {message&&<p role="status" className="dome-create-message">{message}</p>}
 </div>;
}
