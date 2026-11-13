'use client';
import {useState} from 'react';
import styles from './proposta.module.css';
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
 return <div className={"premium-root "+styles.premiumFrame}>
 <section className="print-document" aria-label="Proposta comercial">
 <div className="proposal-letterhead">
  <div><div className="proposal-brand">✦ ANTARES</div><div className="proposal-subbrand">PLANETÁRIO KIDS</div></div>
  <div className="proposal-kicker">PROPOSTA COMERCIAL</div>
 </div>
 <div className="proposal-body">
  <div className="proposal-eyebrow">EDUCAÇÃO • CIÊNCIA • EXPERIÊNCIA</div>
  <h2>{p.title}</h2>
  <p className="proposal-description">Uma experiência educativa pelo universo, preparada para sua instituição.</p>
  <div className="proposal-client"><div className="proposal-label">INSTITUIÇÃO</div><strong>{p.client_name}</strong><p>Participantes previstos: {p.expected_attendees}</p></div>
  <div className="proposal-finance">
   <div className="proposal-highlight"><div className="proposal-label">INVESTIMENTO TOTAL</div><strong>{Number(p.total).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></div>
   <div><div className="proposal-label">SINAL PREVISTO</div><strong>{Number(p.deposit).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></div>
   <div><div className="proposal-label">SALDO PREVISTO</div><strong>{Math.max(0,Number(p.total)-Number(p.deposit)).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></div>
  </div>
  <div className="proposal-terms"><h3>Condições comerciais</h3><p>{terms||'A definir com a instituição.'}</p></div>
  <div className="proposal-valid"><strong>Validade da proposta</strong><span>{valid?valid.split('-').reverse().join('/'):'A definir'}</span></div>
 </div>
 <div className="proposal-footer"><strong>ANTARES · PLANETÁRIO KIDS</strong><span>Documento informativo. A aprovação interna não constitui aceite da instituição ou confirmação de reserva.</span></div>
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
 <style>{`
.print-document{background:white;color:#142e55;border:1px solid #cddbf0;border-radius:12px;overflow:hidden;font-family:Arial,sans-serif}
.proposal-letterhead{background:#12305d;color:white;display:flex;justify-content:space-between;align-items:center;padding:26px 30px;gap:15px}
.proposal-brand{font-size:27px;font-weight:800;letter-spacing:1px}
.proposal-subbrand{font-size:11px;letter-spacing:2px}
.proposal-kicker{font-size:11px;letter-spacing:1px;font-weight:bold}
.proposal-body{padding:30px}
.proposal-eyebrow{color:#245ac0;font-weight:700;letter-spacing:1.2px;font-size:10px}
.proposal-body h2{font-size:24px;line-height:1.25;margin:12px 0}
.proposal-description{color:#4d6686;margin-bottom:25px}
.proposal-client{background:#eff5fd;border:1px solid #d7e3f4;padding:20px;border-radius:9px}
.proposal-client strong{font-size:20px;display:block;margin-top:7px}
.proposal-client p{margin:9px 0 0}
.proposal-label{font-size:10px;font-weight:700;color:#49658b;letter-spacing:0.7px}
.proposal-finance{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:10px;margin:22px 0}
.proposal-finance>div{border:1px solid #d3def0;padding:14px 12px;border-radius:8px;min-width:0}
.proposal-finance strong{font-size:17px;display:block;margin-top:8px;white-space:nowrap}
.proposal-finance .proposal-highlight{background:#12305d;color:white}
.proposal-highlight .proposal-label{color:#d8e7fc}
.proposal-terms h3{font-size:16px;margin:20px 0 8px}
.proposal-terms p{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}
.proposal-valid{display:flex;justify-content:space-between;gap:15px;border-top:1px solid #d3def0;margin-top:22px;padding-top:16px}
.proposal-footer{border-top:3px solid #c9a45b;margin:20px 30px 0;padding:13px 0 22px;display:flex;flex-direction:column;gap:6px;color:#536a87;font-size:11px}
.proposal-footer strong{color:#12305d;letter-spacing:.8px}
@media print{
 @page{size:A4 portrait;margin:0}
 .shell,.shell>.main,.content{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;min-width:0!important}
 .content>:not(main){display:none!important}
 .sidebar,.topbar{display:none!important}
 html,body{margin:0!important;padding:0!important;background:white!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
 header,nav,aside{display:none!important}
 main{max-width:none!important;margin:0!important;padding:0!important}
 main>:not(.premium-root),.premium-root>:not(.print-document){display:none!important}
 .premium-root{margin:0!important}
 .print-document{display:block!important;width:210mm!important;height:297mm!important;box-sizing:border-box!important;border:0!important;border-radius:0!important;break-inside:avoid!important;page-break-after:avoid!important;background:white!important}
 .proposal-letterhead{padding:15mm 17mm!important;background:#12305d!important;color:white!important}
 .proposal-body{padding:13mm 17mm 0!important}
 .proposal-body h2{font-size:20pt!important}
 .proposal-client{margin-top:7mm}
 .proposal-finance{margin:9mm 0!important}
 .proposal-finance strong{font-size:13pt!important}
 .proposal-terms p{max-height:72mm;overflow:hidden}
 .proposal-footer{margin:0!important;padding:5mm 17mm 9mm!important;position:absolute;bottom:0;left:0;right:0;background:white!important}
 .print-document{position:relative}
}
`}</style>
 </div>;
}
