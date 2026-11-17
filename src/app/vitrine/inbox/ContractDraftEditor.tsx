'use client';

import {useEffect,useState,type CSSProperties} from 'react';
import {FileDown,Save,ArrowLeft} from 'lucide-react';

type Proposal={id:string;title:string;total:number;expected_attendees:number|null;payment_terms?:string|null};
type Draft={
 id:string;contract_id:string;title:string;institution:string;responsible:string;
 object_text:string;terms:string;version_number:number;archived_at:string|null;
 contractor_legal_name:string|null;contractor_document:string|null;contractor_address:string|null;
 provider_legal_name:string|null;provider_document:string|null;provider_address:string|null;
 provider_representative:string|null;
};
type FormData={
 title:string;institution:string;responsible:string;object:string;terms:string;
 contractor_legal_name:string;contractor_document:string;contractor_address:string;
 provider_legal_name:string;provider_document:string;provider_address:string;provider_representative:string;
};
type Profile={legal_name:string;document_number:string;full_address:string;representative:string};
const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
const input:CSSProperties={width:'100%',padding:'10px 12px',background:'#fff',border:'1px solid #b5cdec',borderRadius:9,color:'#163b72',fontSize:13,marginTop:5};
const label:CSSProperties={fontSize:12,fontWeight:750,color:'#1b4e8a'};
const action:CSSProperties={padding:'10px 13px',border:'1px solid #1d5db7',background:'#1b60bd',color:'#fff',fontSize:12,fontWeight:750,borderRadius:9,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:7,justifyContent:'center'};
const grey:CSSProperties={...action,background:'#e8f2ff',color:'#164987',borderColor:'#b1cbed'};
const blank:FormData={
 title:'',institution:'',responsible:'',object:'',terms:'',
 contractor_legal_name:'',contractor_document:'',contractor_address:'',
 provider_legal_name:'',provider_document:'',provider_address:'',provider_representative:''
};
const parseDraft=(d:Draft):FormData=>({
 title:d.title,institution:d.institution,responsible:d.responsible||'',object:d.object_text||'',terms:d.terms||'',
 contractor_legal_name:d.contractor_legal_name||'',contractor_document:d.contractor_document||'',contractor_address:d.contractor_address||'',
 provider_legal_name:d.provider_legal_name||'',provider_document:d.provider_document||'',provider_address:d.provider_address||'',
 provider_representative:d.provider_representative||''
});
const sanitize=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const htmlLines=(v:string)=>sanitize(v).replace(/\r\n?/g,'\n').replace(/\n/g,'<br>');

export default function ContractDraftEditor({contractId,clientId,proposal,institution,responsible,onClose,onDismiss,closeRequest}:{
 contractId:string;clientId:string;proposal:Proposal;institution:string;responsible:string;
 onClose:()=>void;onDismiss:()=>void;closeRequest:number;
}){
 const [form,setForm]=useState<FormData>(blank);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [saved,setSaved]=useState<Draft|null>(null);
 const [ready,setReady]=useState(false);
 const [dirty,setDirty]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [discard,setDiscard]=useState<'back'|'dismiss'|null>(null);
 const update=(field:keyof FormData,value:string)=>{setForm(v=>({...v,[field]:value}));setDirty(true);setNotice('');};

 async function getDrafts(){
  const res=await fetch('/api/clientes/contratos/minutas?contractId='+encodeURIComponent(contractId),{cache:'no-store'});
  const data=await res.json();
  if(!res.ok||!Array.isArray(data.drafts))throw Error(data.error||'Minutas indisponíveis.');
  return data.drafts as Draft[];
 }
 useEffect(()=>{
  let mounted=true;
  void (async()=>{
   try{
    const res=await fetch('/api/clientes/contratos/dados-juridicos?clientId='+encodeURIComponent(clientId),{cache:'no-store'});
    const profile=await res.json();
    if(!res.ok)throw Error(profile.error||'Cadastro jurídico indisponível.');
    const drafts=await getDrafts();
    // A reserva é somente leitura; indisponibilidade não impede redigir a minuta.
    let booking:{starts_at:string;ends_at:string;dome_name:string|null}|undefined;
    try{
     const bookingResponse=await fetch('/api/agenda/reservas',{cache:'no-store'});
     if(bookingResponse.ok){
      const bookingData=await bookingResponse.json();
      if(Array.isArray(bookingData.links))booking=bookingData.links.find(
       (entry:{proposal_id:string;status:string})=>entry.proposal_id===proposal.id&&entry.status!=='cancelled');
     }
    }catch{/* Data e horário continuarão a confirmar. */}
    if(!mounted)return;
    const existing=drafts.find(d=>!d.archived_at);
    if(existing){
     setSelectedId(existing.id);setSaved(existing);setForm(parseDraft(existing));
    }else{
     const contractor=profile.contractor as Profile|null;
     const provider=profile.provider as Profile|null;
     const count=Number(proposal.expected_attendees||0);
     setForm({
      title:'Contrato de prestação de serviços — '+proposal.title,
      institution,responsible,
      object:'Apresentação do planetário móvel: '+proposal.title,
      terms:[
       '1. OBJETO — Prestação do serviço de apresentação de planetário móvel referente à proposta aceita.',
       booking
        ?'2. DATA, LOCAL E HORÁRIOS — Agendado para '+new Intl.DateTimeFormat('pt-BR',{
          dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'
         }).format(new Date(booking.starts_at))+' até '+new Intl.DateTimeFormat('pt-BR',{
          timeStyle:'short',timeZone:'America/Sao_Paulo'
         }).format(new Date(booking.ends_at))+(booking.dome_name?' · Cúpula: '+booking.dome_name:'')+'. Local/endereço: conferir com a instituição.'
        :'2. DATA, LOCAL E HORÁRIOS — A preencher conforme o agendamento confirmado entre as partes.',
       '3. VALOR E PAGAMENTO — Valor total: '+money(Number(proposal.total||0))+'.'+(count>0?' Público previsto: '+count+' participantes.':''),
       ...(proposal.payment_terms?.trim()?['Condições de pagamento: '+proposal.payment_terms.trim()]:[]),
       '4. RESPONSABILIDADES — A instituição disponibilizará o espaço e a infraestrutura acordados; o prestador executará o serviço conforme as condições definidas.',
       '5. REMARCAÇÃO E CANCELAMENTO — Estabelecer as condições aplicáveis de comum acordo antes da formalização.',
       '6. ALTERAÇÕES — Mudanças de data, escopo e valores devem ser acordadas entre as partes.'
      ].join('\n\n'),
      contractor_legal_name:contractor?.legal_name||institution,
      contractor_document:contractor?.document_number||'',
      contractor_address:contractor?.full_address||'',
      provider_legal_name:provider?.legal_name||'',
      provider_document:provider?.document_number||'',
      provider_address:provider?.full_address||'',
      provider_representative:provider?.representative||''
     });
    }
    setReady(true);setDirty(false);
   }catch(e){if(mounted)setError(e instanceof Error?e.message:'Não foi possível abrir a minuta.');}
  })();
  return()=>{mounted=false;};
 },[contractId,clientId,proposal.id,institution,responsible]);

 async function save(){
  if(!ready||saving)return;
  if(form.title.trim().length<3||form.institution.trim().length<2||!form.terms.trim()){
   setError('Preencha o título, a instituição e as cláusulas antes de salvar.');return;
  }
  setSaving(true);setError('');setNotice('');
  try{
   const res=await fetch('/api/clientes/contratos/minutas',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({contractId,draftId:selectedId,...form})
   });
   const data=await res.json();
   if(!res.ok||!data.id)throw Error(data.error||'Não foi possível salvar a minuta.');
   const latest=(await getDrafts()).find(d=>d.id===String(data.id)&&!d.archived_at);
   if(!latest)throw Error('Documento salvo, mas não foi possível reler a versão. Atualize antes de imprimir.');
   setSaved(latest);setSelectedId(latest.id);setForm(parseDraft(latest));
   setDirty(false);setNotice('Minuta salva no Neon, com o histórico de versões preservado.');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}
  finally{setSaving(false);}
 }
 function print(){
  if(dirty||!saved){setError('Salve as alterações antes de visualizar o PDF.');return;}
  const d=saved;
  const page=window.open('','_blank');
  if(!page){setError('Permita a abertura da janela para imprimir ou salvar em PDF.');return;}
  const logo=new URL('/antares-logo-pdf.png',window.location.origin).href;
  page.document.open();
  page.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${sanitize(d.title)} · ANTARES</title>
<style>@page{size:A4;margin:17mm}body{font-family:Arial,sans-serif;background:#eaf1f9;color:#183858;margin:0;line-height:1.55;font-size:11pt}
main{max-width:190mm;min-height:255mm;box-sizing:border-box;padding:19mm;margin:20px auto;background:#fff;box-shadow:0 3px 18px #aec2dd}
header img{max-width:100%;height:auto;max-height:58mm}h1{font-size:19pt;color:#12418b;border-bottom:3px solid #2675cf;padding:12px 0}h2{font-size:12pt;color:#174987;border-bottom:1px solid #d5e4f5;margin-top:21px;padding-bottom:5px}p{overflow-wrap:anywhere}.signatures{display:flex;gap:25px;margin-top:60px}.signatures div{flex:1;text-align:center;border-top:1px solid #123c70;padding-top:10px}.toolbar{max-width:190mm;margin:15px auto}.toolbar button{padding:12px 18px;background:#165abc;color:white;border:0;border-radius:8px;cursor:pointer}
@media print{body{background:white}main{margin:0;padding:0;min-height:0;box-shadow:none}.toolbar{display:none}}
</style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir / Salvar PDF</button></div><main>
<header><img src="${sanitize(logo)}" alt="ANTARES"></header>
<h1>${sanitize(d.title)}</h1>
<h2>Instituição contratante</h2><p>${sanitize(d.contractor_legal_name||d.institution)} · ${sanitize(d.contractor_document||'Documento a informar')}<br>${sanitize(d.contractor_address||'Endereço a informar')}</p>
<h2>Prestador de serviços</h2><p>${sanitize(d.provider_legal_name||'Planetário ANTARES')} · ${sanitize(d.provider_document||'Documento a informar')}<br>${sanitize(d.provider_address||'Endereço a informar')}<br>Representante: ${sanitize(d.provider_representative||'A informar')}</p>
<h2>Representante da instituição</h2><p>${sanitize(d.responsible||'A informar')}</p>
<h2>Objeto</h2><p>${htmlLines(d.object_text||'A informar')}</p>
<h2>Cláusulas e condições</h2><p>${htmlLines(d.terms.startsWith('[ANTARES_CONTRATO_LIVRE_V1]\\n')?d.terms.slice('[ANTARES_CONTRATO_LIVRE_V1]\\n'.length):d.terms)}</p>
<div class="signatures"><div>Contratante</div><div>Prestador de serviços</div></div>
<footer style="margin-top:35px;font-size:9pt;color:#64748b">ANTARES · Minuta para conferência pelas partes · Versão ${d.version_number}</footer>
</main></body></html>`);
  page.document.close();
 }
 function exit(target:'back'|'dismiss'='back'){
  if(saving)return;
  if(dirty){setDiscard(target);return;}
  if(target==='dismiss')onDismiss();else onClose();
 }
 useEffect(()=>{
  if(closeRequest>0)exit('dismiss');
  // O pedido é emitido somente pelo X/Esc do modal principal.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[closeRequest]);

 return <section aria-label="Editor do documento contratual"
  style={{display:'grid',gap:15,color:'#174374'}}>
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
   <div>
    <strong style={{fontSize:16}}>Elaborar documento</strong>
    <p style={{fontSize:12,margin:'5px 0 0',color:'#53739b'}}>
     {selectedId?'Minuta existente · edição com histórico':'Novo modelo · dados preenchidos automaticamente'}
    </p>
   </div>
   <button type="button" onClick={()=>exit('back')} disabled={saving} style={grey}><ArrowLeft size={16}/>Voltar ao contrato</button>
  </div>
  {!ready&&!error&&<p role="status">Consultando dados da instituição e minutas já salvas...</p>}
  {error&&<p role="alert" style={{margin:0,padding:11,border:'1px solid #fecaca',background:'#fff1f2',borderRadius:8,color:'#9f1239'}}>{error}</p>}
  {notice&&<p role="status" style={{margin:0,padding:11,border:'1px solid #bbf7d0',background:'#f0fdf4',borderRadius:8,color:'#166534'}}>{notice}</p>}
  {ready&&<div style={{display:'grid',gap:12}}>
   <div style={{padding:12,background:'#eaf3ff',borderRadius:10,border:'1px solid #c5dbf5'}}>
    <strong>{institution}</strong>
    <p style={{margin:'4px 0',fontSize:12}}>Proposta: {proposal.title} · {money(Number(proposal.total||0))}</p>
    <p style={{margin:0,fontSize:12}}>Confira os dados incompletos antes de enviar o contrato. Nenhum documento é enviado automaticamente.</p>
   </div>
   <label style={label}>Título<input style={input} maxLength={200} value={form.title} onChange={e=>update('title',e.target.value)}/></label>
   <label style={label}>Instituição<input style={input} maxLength={200} value={form.institution} onChange={e=>update('institution',e.target.value)}/></label>
   <label style={label}>Representante da instituição<input style={input} maxLength={180} value={form.responsible} onChange={e=>update('responsible',e.target.value)}/></label>
   <label style={label}>Objeto do contrato<textarea style={input} maxLength={8000} rows={2} value={form.object} onChange={e=>update('object',e.target.value)}/></label>
   <div style={{border:'1px solid #bbd3f3',background:'#f4f8ff',padding:12,borderRadius:11,display:'grid',gap:11}}>
    <strong style={{fontSize:13}}>Identificação das partes</strong>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(215px,1fr))',gap:11}}>
     <label style={label}>Contratante — razão social<input style={input} maxLength={240} value={form.contractor_legal_name} onChange={e=>update('contractor_legal_name',e.target.value)}/></label>
     <label style={label}>Contratante — CPF/CNPJ<input style={input} maxLength={30} value={form.contractor_document} onChange={e=>update('contractor_document',e.target.value)}/></label>
     <label style={label}>Contratante — endereço<input style={input} maxLength={500} value={form.contractor_address} onChange={e=>update('contractor_address',e.target.value)}/></label>
     <label style={label}>Prestador — razão social<input style={input} maxLength={240} value={form.provider_legal_name} onChange={e=>update('provider_legal_name',e.target.value)}/></label>
     <label style={label}>Prestador — CPF/CNPJ<input style={input} maxLength={30} value={form.provider_document} onChange={e=>update('provider_document',e.target.value)}/></label>
     <label style={label}>Prestador — endereço<input style={input} maxLength={500} value={form.provider_address} onChange={e=>update('provider_address',e.target.value)}/></label>
     <label style={label}>Prestador — representante<input style={input} maxLength={180} value={form.provider_representative} onChange={e=>update('provider_representative',e.target.value)}/></label>
    </div>
   </div>
   <label style={label}>Cláusulas e condições
    <textarea style={{...input,lineHeight:1.55}} rows={10} maxLength={16000} value={form.terms}
     onChange={e=>update('terms',e.target.value)}/>
   </label>
   <div style={{display:'flex',flexWrap:'wrap',gap:9,alignItems:'center',justifyContent:'flex-end'}}>
    <button type="button" disabled={saving} onClick={()=>exit('dismiss')} style={grey}>Cancelar</button>
    <button type="button" disabled={saving||(!dirty&&Boolean(saved))} onClick={()=>void save()} style={action}>
     <Save size={16}/>{saving?'Salvando...':'Salvar minuta'}
    </button>
    <button type="button" disabled={saving||dirty||!saved} onClick={print} style={{...grey,opacity:(dirty||!saved)?0.6:1}}>
     <FileDown size={16}/>Visualizar / PDF salvo
    </button>
   </div>
  </div>}
  {discard&&<div style={{position:'fixed',inset:0,zIndex:20,background:'rgba(7,29,68,.72)',display:'grid',placeItems:'center',padding:16}}>
   <div role="alertdialog" aria-modal="true" aria-labelledby="discard-contract-title" aria-describedby="discard-contract-description"
    style={{width:'min(100%,430px)',padding:20,border:'1px solid #f0c785',borderRadius:14,background:'#fffaf1',display:'grid',gap:13,boxShadow:'0 24px 70px #071a4380'}}>
    <strong id="discard-contract-title" style={{fontSize:17,color:'#7b4318'}}>Descartar alterações?</strong>
    <p id="discard-contract-description" style={{margin:0,fontSize:13,color:'#62462e'}}>Os campos não salvos serão descartados. A última minuta salva continuará preservada.</p>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}}>
     <button type="button" onClick={()=>setDiscard(null)} style={grey}>Continuar editando</button>
     <button type="button" onClick={()=>{if(discard==='dismiss')onDismiss();else onClose();}} style={action}>Descartar e sair</button>
    </div>
   </div>
  </div>}
 </section>;
}
