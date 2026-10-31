'use client';
import {useState} from 'react';
type Item={id:string;status:string;valid_until:string|null;payment_terms:string|null;title:string;client_name:string;expected_attendees:number;total:number;deposit:number};
type Change={id:string;changed_at:string;before_values:Record<string,unknown>;after_values:Record<string,unknown>};
export default function Premium({proposal:p,history}:{proposal:Item;history:Change[]}){
 const [valid,setValid]=useState(p.valid_until?.slice(0,10)||'');
 const [terms,setTerms]=useState(p.payment_terms||'');
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 async function save(approve:boolean){
  if(busy||!window.confirm(approve?'Aprovar internamente esta proposta? Não haverá envio automático.':'Salvar validade e condições comerciais?'))return;
  setBusy(true);setNotice('');
  try{
   const r=await fetch('/api/vitrine/proposta/aprovar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:p.id,valid:valid||null,terms,approve})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||'Falha');
   setNotice(approve?'Proposta aprovada internamente. Nenhuma mensagem foi enviada.':'Condições salvas. Atualize para conferir.');
   window.location.reload();
  }catch(e){setNotice(e instanceof Error?e.message:'Erro ao salvar')}
  finally{setBusy(false)}
 }
 return <div style={{marginTop:20}}>
 <section style={{background:'#12305d',color:'white',padding:22,borderRadius:14}}>
 <div style={{fontWeight:800,fontSize:23}}>✦ ANTARES — PLANETÁRIO KIDS</div>
 <p>Proposta comercial · {p.status==='draft'?'RASCUNHO NÃO APROVADO':'APROVADA INTERNAMENTE'}</p>
 <h2 style={{fontSize:21}}>{p.title}</h2>
 <p>Instituição: {p.client_name} · Participantes: {p.expected_attendees}</p>
 <p>Total: {Number(p.total).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} · Sinal previsto: {Number(p.deposit).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>
 <p>Validade: {valid||'Não definida'}</p>
 <p style={{whiteSpace:'pre-wrap'}}>Condições: {terms||'Não definidas'}</p>
 <p style={{fontSize:12}}>Pré-visualização interna. O PDF é gerado pelo recurso Imprimir do navegador.</p>
 </section>
 <div className="no-print" style={{marginTop:12}}>
 <button type="button" onClick={()=>window.print()} style={{padding:11,borderRadius:8,background:'#1d4ed8',color:'white'}}>Imprimir / Salvar PDF</button>
 </div>
 <section className="no-print" style={{border:'1px solid #94a3b8',padding:18,borderRadius:12,marginTop:20}}>
 <h2 style={{fontSize:20,fontWeight:700}}>Validade, condições e aprovação</h2>
 {p.status==='draft'?<>
 <label style={{display:'block',marginTop:12}}>Validade da proposta <input type="date" value={valid} onChange={e=>setValid(e.target.value)} style={{display:'block',padding:10,border:'1px solid #94a3b8',borderRadius:7}}/></label>
 <label style={{display:'block',marginTop:12}}>Condições comerciais
 <textarea rows={4} maxLength={2000} value={terms} onChange={e=>setTerms(e.target.value)} style={{display:'block',width:'100%',padding:10,border:'1px solid #94a3b8',borderRadius:7}}/>
 </label>
 <div style={{display:'flex',gap:12,marginTop:12,flexWrap:'wrap'}}>
 <button type="button" disabled={busy} onClick={()=>void save(false)} style={{padding:12,background:'#1d4ed8',color:'white',borderRadius:8}}>Salvar condições</button>
 <button type="button" disabled={busy||!valid||terms.trim().length<10||Number(p.total)<=0} onClick={()=>void save(true)} style={{padding:12,background:'#0f766e',color:'white',borderRadius:8}}>Aprovar internamente</button>
 </div>
 <p>Ao aprovar, a proposta deixa de ser rascunho. Não existe envio automático ao cliente.</p>
 </>:<p>Proposta aprovada internamente. A edição do rascunho está bloqueada.</p>}
 {notice&&<p role="status">{notice}</p>}
 </section>
 <section className="no-print" style={{marginTop:20,border:'1px solid #94a3b8',padding:18,borderRadius:12}}>
 <h2 style={{fontSize:20,fontWeight:700}}>Histórico de alterações financeiras</h2>
 {history.length===0?<p>Nenhuma alteração financeira registrada.</p>:<ul style={{paddingLeft:24}}>
 {history.map(h=><li key={h.id} style={{marginBottom:13}}>
 <strong>{new Date(h.changed_at).toLocaleString('pt-BR')}</strong>
 <div>Antes: {String(h.before_values.total??'—')} · Depois: {String(h.after_values.total??'—')}</div>
 <div>Desconto: {String(h.before_values.discount??'—')} → {String(h.after_values.discount??'—')} · Sinal: {String(h.before_values.deposit??'—')} → {String(h.after_values.deposit??'—')}</div>
 </li>)}</ul>}
 </section>
 <style>{`@media print{body{background:#fff!important;color:#111!important}.no-print{display:none!important}nav,header{display:none!important}main{max-width:100%!important;padding:0!important}section{break-inside:avoid}}`}</style>
 </div>;
}
