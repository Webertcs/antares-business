'use client';
import {useState} from 'react';
import styles from './proposta.module.css';
type Item={id:string;status:string;valid_until:string|null;payment_terms:string|null;title:string;client_name:string;origin_institution:string|null;institution_mismatch:boolean;expected_attendees:number;total:number;deposit:number};
type Change={id:string;changed_at:string;before_values:Record<string,unknown>;after_values:Record<string,unknown>};
export default function Premium({proposal:p,history,documentOnly=false}:{proposal:Item;history:Change[];documentOnly?:boolean}){
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
   <div className="proposal-logo"><img src="/antares-logo-horizontal.png" alt="ANTARES Business · Planetário Móvel Digital" width="184" height="70"/></div>
   <div className="proposal-masthead"><span>ANTARES BUSINESS</span><strong>Proposta comercial</strong><small>PLANETÁRIO MÓVEL DIGITAL</small></div>
  </div>
  <div className="proposal-body">
   <div className="proposal-intro"><span>APRESENTAÇÃO EDUCACIONAL</span><h2>{p.title}</h2></div>
   <div className="proposal-client">
    <div><span className="proposal-label">INSTITUIÇÃO VINCULADA</span><strong>{p.client_name}</strong></div>
    <div className="proposal-attendees"><span className="proposal-label">PÚBLICO PREVISTO</span><strong>{p.expected_attendees} participantes</strong></div>
   </div>
   {p.institution_mismatch&&p.origin_institution&&<div className="proposal-alert"><strong>CONFERIR INSTITUIÇÃO</strong><span>Solicitante da vitrine: {p.origin_institution}</span></div>}
   <div className="proposal-section-title">INVESTIMENTO</div>
   <div className="proposal-finance">
    <div className="proposal-highlight"><span className="proposal-label">VALOR TOTAL</span><strong>{Number(p.total).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></div>
    <div><span className="proposal-label">SINAL PREVISTO</span><strong>{Number(p.deposit).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></div>
    <div><span className="proposal-label">SALDO PREVISTO</span><strong>{Math.max(0,Number(p.total)-Number(p.deposit)).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></div>
   </div>
   <div className="proposal-terms"><h3>Condições comerciais</h3><p>{terms.trim()||'A definir.'}</p></div>
   <div className="proposal-valid"><strong>Validade da proposta</strong><span>{valid?valid.split('-').reverse().join('/'):'A definir'}</span></div>
  </div>
  <div className="proposal-footer"><strong>ANTARES BUSINESS</strong><span>PLANETÁRIO MÓVEL DIGITAL</span></div>
 </section>
 <div className="no-print proposal-actions"><button type="button" onClick={()=>window.print()}>Imprimir / Salvar PDF</button></div>
 {!documentOnly&&p.status==='draft'&&<section className="no-print proposal-admin-panel">
  <h2>Validade e aprovação</h2>
  <div className="proposal-admin-fields">
   <label>Validade da proposta<input type="date" value={valid} onChange={e=>setValid(e.target.value)}/></label>
   <label>Condições comerciais<textarea rows={3} maxLength={2000} value={terms} onChange={e=>setTerms(e.target.value)}/></label>
  </div>
  <div className="proposal-admin-actions">
   <button type="button" disabled={busy} onClick={()=>void save(false)}>Salvar condições</button>
   <button type="button" disabled={busy||!valid||terms.trim().length<10||Number(p.total)<=0} onClick={()=>void save(true)}>Aprovar internamente</button>
  </div>
  {notice&&<p role="status">{notice}</p>}
 </section>}
 {!documentOnly&&<section className="no-print proposal-admin-panel proposal-history">
  <h2>Histórico financeiro</h2>
  {history.length===0?<p>Sem alterações registradas.</p>:<div className="proposal-history-list">
   {history.map(h=><div className="proposal-history-entry" key={h.id}>
    <strong>{new Date(h.changed_at).toLocaleString('pt-BR')}</strong>
    <span>Total: {String(h.before_values.total??'—')} → {String(h.after_values.total??'—')}</span>
    <small>Desconto: {String(h.before_values.discount??'—')} → {String(h.after_values.discount??'—')} · Sinal: {String(h.before_values.deposit??'—')} → {String(h.after_values.deposit??'—')}</small>
   </div>)}
  </div>}
 </section>}
 <style>{`
.print-document{background:#fff;color:#143563;border:1px solid #c5d9f5;border-radius:13px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column;min-height:730px}
.proposal-letterhead{background:linear-gradient(112deg,#102d68 0%,#164c95 56%,#287bd2 100%);color:white;display:flex;justify-content:space-between;align-items:center;padding:24px 28px;gap:20px}
.proposal-logo{background:white;border:1px solid #d9e8ff;border-radius:10px;width:187px;height:73px;display:grid;place-items:center;padding:6px;flex-shrink:0}
.proposal-logo img{width:100%;height:100%;object-fit:contain}
.proposal-masthead{text-align:right;display:flex;flex-direction:column;gap:6px}
.proposal-masthead span{font-size:10px;font-weight:850;letter-spacing:2px;color:#cfebff}
.proposal-masthead strong{font-size:24px;line-height:1.2;color:#fff}
.proposal-masthead small{font-size:9px;letter-spacing:1.4px;color:#d5ebff}
.proposal-body{padding:27px 29px 20px}
.proposal-intro span{display:block;font-size:10px;font-weight:850;letter-spacing:1.2px;color:#3972bb}
.proposal-intro h2{font-size:25px;color:#0f356a;line-height:1.26;margin:9px 0 23px;overflow-wrap:anywhere}
.proposal-client{background:linear-gradient(110deg,#f6faff,#e8f2ff);border:1px solid #c7ddf8;border-left:4px solid #287ad4;border-radius:11px;padding:17px 19px;display:flex;justify-content:space-between;align-items:center;gap:20px}
.proposal-client>div{min-width:0}
.proposal-client strong{display:block;font-size:18px;color:#103d76;margin-top:7px;overflow-wrap:anywhere}
.proposal-attendees{text-align:right;flex-shrink:0}
.proposal-attendees strong{font-size:15px}
.proposal-label{display:block;font-size:10px;font-weight:850;color:#5a789d;letter-spacing:.7px}
.proposal-alert{display:flex;align-items:center;flex-wrap:wrap;gap:5px 13px;background:#fff6e6;border:1px solid #eccd8d;border-radius:8px;color:#815b15;padding:10px 13px;margin-top:13px;font-size:12px}
.proposal-alert strong{font-size:11px;letter-spacing:.5px}
.proposal-section-title{font-size:11px;font-weight:850;letter-spacing:1.2px;color:#154580;margin-top:25px;margin-bottom:10px}
.proposal-finance{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:11px}
.proposal-finance>div{border:1px solid #c6daf5;border-top:3px solid #2c79cd;padding:17px 13px;background:linear-gradient(145deg,#fff,#edf5ff);border-radius:10px;min-width:0}
.proposal-finance>div:nth-child(2){border-top-color:#ed9b36}
.proposal-finance>div:nth-child(3){border-top-color:#1dae91}
.proposal-finance strong{display:block;color:#10427e;font-size:20px;margin-top:11px;overflow-wrap:anywhere}
.proposal-finance .proposal-highlight{background:linear-gradient(135deg,#123e83,#2473ca);color:white;border-color:#2164b3}
.proposal-highlight .proposal-label{color:#dcecff}
.proposal-finance .proposal-highlight strong{color:#fff}
.proposal-terms{margin-top:25px}
.proposal-terms h3{border-bottom:1px solid #d4e2f5;padding-bottom:9px;margin:0 0 12px;font-size:15px;color:#124681}
.proposal-terms p{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.6;color:#274e7b;margin:0}
.proposal-valid{display:flex;justify-content:space-between;gap:20px;border-top:1px solid #d4e2f5;margin-top:25px;padding-top:13px;font-size:13px;color:#194b83}
.proposal-valid strong{font-weight:800}
.proposal-valid span{font-weight:750}
.proposal-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:2px solid #d9b16b;margin:20px 29px 0;padding:15px 0 21px;color:#627fa1;font-size:10px;letter-spacing:.7px}
.proposal-footer strong{color:#174782;font-size:11px}
.proposal-actions{margin-top:13px}
.proposal-actions button{padding:11px 17px;border-radius:9px;border:1px solid #1456ab;background:linear-gradient(110deg,#153e83,#2275ce);box-shadow:0 4px 11px #16478833;color:#fff;font-weight:850;cursor:pointer}
.proposal-admin-panel{margin-top:15px;border:1px solid #c5d9f5;background:linear-gradient(145deg,#fff,#eff6ff);box-shadow:0 6px 18px #1746801b;border-radius:12px;padding:18px}
.proposal-admin-panel h2{font-size:15px;margin:0 0 12px;color:#17467c;font-weight:850}
.proposal-admin-fields{display:grid;grid-template-columns:minmax(160px,1fr) minmax(280px,2fr);gap:13px}
.proposal-admin-fields label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#315c8a;font-weight:750}
.proposal-admin-fields input,.proposal-admin-fields textarea{border:1px solid #b5d0f2;border-radius:8px;background:#f9fcff;padding:10px;color:#174275;max-width:100%}
.proposal-admin-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.proposal-admin-actions button{padding:10px 14px;border-radius:8px;background:linear-gradient(120deg,#154688,#267ad1);color:white;border:1px solid #327ac5;font-weight:800;cursor:pointer}
.proposal-admin-actions button:last-child{background:linear-gradient(120deg,#0b8c6a,#17ac7d);border-color:#0d916b}
.proposal-admin-actions button:disabled{opacity:.5;cursor:not-allowed}
.proposal-admin-panel p{font-size:12px;color:#426996}
.proposal-history-list{display:grid;gap:8px}
.proposal-history-entry{display:grid;gap:5px;padding:11px 14px;background:#edf5ff;border-left:3px solid #3489e9;border-radius:7px;color:#285580;font-size:12px}
.proposal-history-entry strong{font-size:12px;color:#0f427e}
.proposal-history-entry small{font-size:11px;color:#59789d}
@media(max-width:640px){.proposal-letterhead{padding:18px;gap:9px}.proposal-logo{width:133px;height:62px}.proposal-masthead strong{font-size:17px}.proposal-masthead span{font-size:8px}.proposal-masthead small{font-size:7px}.proposal-body{padding:20px 16px}.proposal-client{flex-direction:column;align-items:flex-start}.proposal-attendees{text-align:left}.proposal-finance{grid-template-columns:1fr}.proposal-footer{margin:15px 16px 0}.proposal-admin-fields{grid-template-columns:1fr}}
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
 .print-document{display:flex!important;flex-direction:column!important;width:210mm!important;min-height:297mm!important;height:auto!important;box-sizing:border-box!important;border:0!important;border-radius:0!important;overflow:visible!important;box-shadow:none!important;background:white!important}
 .proposal-letterhead{padding:13mm 16mm!important;background:linear-gradient(112deg,#102d68,#287bd2)!important;color:white!important}
 .proposal-logo{width:49mm!important;height:21mm!important}
 .proposal-masthead strong{font-size:19pt!important}
 .proposal-body{padding:13mm 16mm 0!important}
 .proposal-intro h2{font-size:21pt!important;margin-bottom:8mm!important}
 .proposal-client{padding:5mm!important}
 .proposal-finance{margin:0!important}
 .proposal-finance strong{font-size:15pt!important}
 .proposal-terms p{max-height:none!important;overflow:visible!important}
 .proposal-footer{margin:auto 16mm 0!important;padding:5mm 0 8mm!important;position:static!important}
}
`}</style>
 </div>;
}
