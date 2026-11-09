'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function EventDomePicker({eventId,initialDomeId,domes}:{eventId:string;initialDomeId:string;domes:{id:string;name:string;capacity:number|null}[]}){
 const router=useRouter();
 const [selected,setSelected]=useState(initialDomeId),[saved,setSaved]=useState(initialDomeId),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 return <div style={{background:'#edf5ff',border:'1px solid #c4d8ff',borderRadius:12,padding:12}}>
 <label style={{display:'block',fontSize:13,fontWeight:700,color:'#28589b'}}>🪐 Cúpula do evento
 <select value={selected} onChange={e=>{setSelected(e.target.value);setMessage('');}} style={{display:'block',width:'100%',marginTop:6,padding:10,borderRadius:8,border:'1px solid #b7cdec',background:'#fff',color:'#173668'}}>
 <option value="">A definir</option>{domes.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
 {selected!==saved&&<button type="button" disabled={busy} onClick={async()=>{setBusy(true);setMessage('');try{const res=await fetch('/api/eventos/cupula',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId,domeId:selected||null})});const data=await res.json();if(!res.ok)throw Error(data.error||'Falha ao salvar.');setSaved(selected);setMessage('Cúpula salva. Atualizando o indicador…');router.refresh();}catch(e){setMessage(e instanceof Error?e.message:'Falha ao salvar.');}finally{setBusy(false);}}} style={{marginTop:10,background:'#195ac2',color:'#fff',border:0,borderRadius:8,padding:'9px 14px',fontWeight:700}}>{busy?'Salvando…':'Salvar cúpula'}</button>}
 {message&&<p role="status" style={{fontSize:12,margin:'8px 0 0'}}>{message}</p>}
 {domes.length===0&&<p style={{fontSize:12}}>Nenhuma cúpula ativa cadastrada. Cadastre em Operação → Cúpulas.</p>}
 </div>;
}
