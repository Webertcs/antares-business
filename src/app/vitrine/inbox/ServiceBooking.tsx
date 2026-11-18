'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import {CalendarCheck2,CheckCircle2,X} from 'lucide-react';

export type ServiceProposal={id:string;title:string;client_name:string;mapped:boolean;expected_attendees:number|null};
export type ServiceDome={id:string;name:string;capacity:number|null;mapped:boolean};
export type ServiceReservation={
 proposal_id:string;presentation_id:string;starts_at:string;ends_at:string;
 status:string;dome_id:string|null;dome_name:string|null;
 crm_event_id:string|null;crm_event_status:string|null
};
export type ServiceBookingData={
 proposals:ServiceProposal[];domes:ServiceDome[];links:ServiceReservation[]
};

const fmt=(value:string)=>new Intl.DateTimeFormat('pt-BR',{
 dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'
}).format(new Date(value));
const normal=(value:string)=>{const dt=new Date(value);return Number.isFinite(dt.getTime())?dt:null;};
const localInput=(value:string)=>{
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));
 const get=(type:string)=>parts.find(p=>p.type===type)?.value||'';
 return get('year')+'-'+get('month')+'-'+get('day')+'T'+get('hour')+':'+get('minute');
};
const field:React.CSSProperties={width:'100%',minHeight:42,border:'1px solid #b4cdf0',
 borderRadius:9,padding:'9px 11px',color:'#173e79',background:'#fff',fontSize:14};
const secondary:React.CSSProperties={padding:'10px 16px',border:'1px solid #aac8ee',
 background:'#e7f0fc',color:'#1b518e',borderRadius:9,fontWeight:750,cursor:'pointer'};
const primary:React.CSSProperties={padding:'10px 16px',border:'1px solid #174f9b',
 background:'linear-gradient(110deg,#246fc9,#1351a0)',color:'#fff',
 borderRadius:9,fontWeight:750,cursor:'pointer'};

export default function ServiceBooking({
 proposalId,institution,enabled,onClose,onSaved
}:{
 proposalId:string;institution:string;enabled:boolean;onClose:()=>void;onSaved:(result:'reserved'|'rescheduled'|'cancelled'|'linked')=>void;
}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [data,setData]=useState<ServiceBookingData|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [confirmLink,setConfirmLink]=useState(false);
 const [error,setError]=useState('');
 const [domeId,setDomeId]=useState('');
 const [start,setStart]=useState('');
 const [end,setEnd]=useState('');
 const [action,setAction]=useState<'edit'|'cancel'|null>(null);
 const [reason,setReason]=useState('');
 const [confirmCancel,setConfirmCancel]=useState(false);
 const [confirmOperational,setConfirmOperational]=useState(false);

 async function load(){
  const result=await fetch('/api/agenda/reservas',{cache:'no-store'});
  const json=await result.json();
  if(!result.ok)throw Error(json.error||'Não foi possível consultar as reservas.');
  if(!Array.isArray(json.proposals)||!Array.isArray(json.domes)||!Array.isArray(json.links))
   throw Error('Consulta de reservas incompleta.');
  setData(json as ServiceBookingData);
 }
 useEffect(()=>{
  const current=dialog.current;
  if(current&&!current.open)current.showModal();
  let live=true;
  (async()=>{
   try{
    const response=await fetch('/api/agenda/reservas',{cache:'no-store'});
    const json=await response.json();
    if(!response.ok)throw Error(json.error||'Reservas indisponíveis.');
    if(!Array.isArray(json.proposals)||!Array.isArray(json.domes)||!Array.isArray(json.links))
     throw Error('Informações de reservas incompletas.');
    if(live)setData(json as ServiceBookingData);
   }catch(e){if(live)setError(e instanceof Error?e.message:'Falha ao consultar reservas.');}
   finally{if(live)setLoading(false);}
  })();
  return()=>{live=false;if(current?.open)current.close();};
 },[]);

 const proposal=data?.proposals.find(p=>p.id===proposalId);
 const reservation=data?.links.find(r=>r.proposal_id===proposalId);
 const reservationCancelled=reservation?.status==='cancelled'||reservation?.crm_event_status==='cancelled';
 const reservationClosed=reservation?.status==='completed'||reservation?.crm_event_status==='completed';
 const canManage=enabled&&!busy&&Boolean(reservation)&&!reservationCancelled&&!reservationClosed;
 const domes=data?.domes.filter(d=>d.mapped)||[];
 const selectedDome=domes.find(d=>d.id===domeId);
 const capacityOk=!selectedDome||!proposal?.expected_attendees||selectedDome.capacity==null||Number(proposal.expected_attendees)<=Number(selectedDome.capacity);
 const startDate=normal(start),endDate=normal(end);
 const validDates=Boolean(startDate&&endDate&&endDate.getTime()>startDate.getTime()&&startDate.getTime()>Date.now());
 const conflicting=Boolean(validDates&&domeId&&data?.links.some(r=>
  r.status!=='cancelled'&&r.presentation_id!==reservation?.presentation_id&&r.dome_id===domeId&&
  new Date(r.starts_at).getTime()<endDate!.getTime()&&new Date(r.ends_at).getTime()>startDate!.getTime()));
 const canSave=enabled&&!busy&&Boolean(proposal?.mapped)&&Boolean(selectedDome)&&validDates&&!conflicting&&capacityOk&&!reservation;

 async function linkClient(){
  if(!enabled||busy||!proposal)return;
  if(!confirmLink)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/agenda/preparar',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'link-client',proposalId})
   });
   const json=await response.json();
   if(!response.ok)throw Error(json.error||'Não foi possível vincular a instituição.');
   await load();
   setConfirmLink(false);
  }catch(e){setError(e instanceof Error?e.message:'Falha ao vincular instituição.');}
  finally{setBusy(false);}
 }

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!canSave||!startDate||!endDate){setError('Verifique cúpula, horário, disponibilidade e vínculo da instituição.');return;}
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/agenda/reservas',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({proposalId,domeId,start:startDate.toISOString(),end:endDate.toISOString()})
   });
   const json=await response.json();
   if(!response.ok)throw Error(json.error||'Reserva recusada.');
   onSaved('reserved');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível registrar a reserva.');}
  finally{setBusy(false);}
 }

 async function manageReservation(){
  if(!reservation||!canManage||!action)return;
  if(action==='cancel'&&(!confirmCancel||reason.trim().length<5||reason.trim().length>500)){
   setError('Informe o motivo do cancelamento (5 a 500 caracteres) e confirme.');return;
  }
  if(action==='edit'&&(!validDates||!selectedDome||!capacityOk||conflicting)){
   setError('Confira a nova cúpula, as datas e a disponibilidade.');return;
  }
  setBusy(true);setError('');
  try{
   const body=action==='cancel'
    ?{presentationId:reservation.presentation_id,action:'cancel',confirm:'CANCELAR',reason:reason.trim()}
    :{presentationId:reservation.presentation_id,action:'edit',domeId,start:startDate!.toISOString(),end:endDate!.toISOString(),reason:'Reagendamento solicitado pela instituição'};
   const response=await fetch('/api/agenda/reservas',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const json=await response.json();
   if(!response.ok)throw Error(json.error||'Não foi possível atualizar a apresentação.');
   onSaved(action==='cancel'?'cancelled':'rescheduled');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível atualizar a reserva.');}
  finally{setBusy(false);}
 }

 async function linkOperationalEvent(){
  if(!reservation||reservationCancelled||reservationClosed||!confirmOperational||busy)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/agenda/reservas/vincular',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({presentationId:reservation.presentation_id})});
   const json=await response.json();
   if(!response.ok)throw Error(json.error||'Não foi possível vincular o evento.');
   onSaved('linked');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível vincular o evento.');}
  finally{setBusy(false);}
 }

 return <dialog ref={dialog} aria-labelledby="service-booking-title"
  onCancel={e=>{e.preventDefault();if(!busy)onClose();}}
  style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%, -50%)',margin:0,
   width:'min(100% - 24px,590px)',maxHeight:'90vh',overflowY:'auto',
   border:0,borderRadius:17,padding:0,color:'#183d73',background:'#f8fbff',
   boxShadow:'0 25px 70px #071c4990'}}>
  <header style={{display:'flex',gap:12,alignItems:'center',justifyContent:'space-between',
   padding:'18px 20px',background:'linear-gradient(110deg,#10336e,#2376d3)',color:'#fff'}}>
   <div style={{display:'flex',gap:10,alignItems:'center'}}>
    <CalendarCheck2 size={24} aria-hidden="true"/>
    <div><div style={{fontSize:11,opacity:.8,fontWeight:700}}>CENTRAL DE ATENDIMENTO</div>
     <h2 id="service-booking-title" style={{margin:0,fontSize:21,color:'#fff'}}>Organizar reserva</h2>
    </div>
   </div>
   <button type="button" aria-label="Fechar reserva" disabled={busy} onClick={onClose}
    style={{background:'#eaf3ff',border:0,borderRadius:9,color:'#164987',padding:9,cursor:'pointer'}}>
    <X size={18}/></button>
  </header>
  <div style={{padding:20,display:'grid',gap:14}}>
   <div style={{background:'#e8f2ff',border:'1px solid #c6dcfa',borderRadius:11,padding:13}}>
    <strong>{institution}</strong>
    <div style={{fontSize:12,marginTop:4}}>Proposta aceita. Contrato escrito opcional.</div>
   </div>
   {error&&<p role="alert" style={{margin:0,padding:11,color:'#9b1c32',
    background:'#fff1f3',border:'1px solid #fecdd3',borderRadius:9}}>{error}</p>}
   {loading&&<p role="status">Consultando cúpulas e reservas existentes...</p>}
   {!loading&&reservation&&<div style={{background:reservationCancelled?'#fff4e5':'#e4f9ee',border:'1px solid '+(reservationCancelled?'#edcb92':'#a7e4bc'),padding:14,borderRadius:10,display:'grid',gap:10}}>
    <strong><CheckCircle2 size={16} style={{display:'inline',verticalAlign:'middle'}}/> {reservationCancelled?'Apresentação cancelada':reservationClosed?'Apresentação concluída':'Reserva confirmada'}</strong>
    <p style={{margin:0,fontSize:13}}>Cúpula: {reservation.dome_name||'A definir'} · {fmt(reservation.starts_at)} até {fmt(reservation.ends_at)}.</p>
    {reservationCancelled?<p style={{margin:0,fontSize:12}}>Atendimento arquivado. A reserva foi cancelada, sem registrar alunos atendidos. Histórico e pagamentos permanecem disponíveis.</p>:
     reservationClosed?<p style={{margin:0,fontSize:12}}>Apresentação encerrada. Consulte a conclusão e o histórico.</p>:
     <div style={{display:'grid',gap:10}}>
      {canManage&&!action&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
       <button type="button" style={secondary} onClick={()=>{setAction('edit');setDomeId(reservation.dome_id||'');setStart(localInput(reservation.starts_at));setEnd(localInput(reservation.ends_at));setConfirmCancel(false);setError('');}}>Reagendar</button>
       <button type="button" style={{...secondary,color:'#9f1d35',borderColor:'#e7bac4',background:'#fff1f3'}} onClick={()=>{setAction('cancel');setReason('');setConfirmCancel(false);setError('');}}>Cancelar apresentação</button>
      </div>}
      {action==='edit'&&<div style={{display:'grid',gap:10,background:'#fff',padding:12,borderRadius:9,border:'1px solid #c1d7f0'}}>
       <strong>Escolher nova data e cúpula</strong>
       <label>Cúpula
        <select style={field} value={domeId} disabled={busy} onChange={e=>setDomeId(e.target.value)}>
         <option value="">Selecionar cúpula</option>
         {domes.map(d=><option key={d.id} value={d.id}>{d.name}{d.capacity?' · até '+d.capacity+' pessoas':''}</option>)}
        </select>
       </label>
       <label>Início<input type="datetime-local" style={field} value={start} disabled={busy} onChange={e=>setStart(e.target.value)}/></label>
       <label>Término<input type="datetime-local" style={field} value={end} disabled={busy} onChange={e=>setEnd(e.target.value)}/></label>
       {!validDates&&<p role="status" style={{fontSize:12,margin:0}}>Escolha horários futuros e término posterior ao início.</p>}
       {conflicting&&<p role="alert" style={{fontSize:12,color:'#a02135',margin:0}}>Conflito de horário nessa cúpula.</p>}
       {!capacityOk&&<p role="alert" style={{fontSize:12,color:'#a02135',margin:0}}>Capacidade insuficiente.</p>}
       <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
        <button type="button" style={secondary} disabled={busy} onClick={()=>setAction(null)}>Voltar</button>
        <button type="button" style={primary} disabled={busy||!validDates||!selectedDome||conflicting||!capacityOk} onClick={()=>void manageReservation()}>{busy?'Salvando...':'Confirmar reagendamento'}</button>
       </div>
      </div>}
      {action==='cancel'&&<div style={{display:'grid',gap:10,background:'#fff',padding:12,borderRadius:9,border:'1px solid #e7bac4'}}>
       <strong>Cancelar a apresentação</strong>
       <label>Motivo informado pela escola
        <textarea rows={3} maxLength={500} value={reason} disabled={busy} onChange={e=>{setReason(e.target.value);setConfirmCancel(false);}} style={{...field,resize:'vertical'}} placeholder="Informe o motivo para o histórico"/>
       </label>
       <label style={{fontSize:12,display:'flex',gap:8,alignItems:'flex-start'}}>
        <input type="checkbox" checked={confirmCancel} onChange={e=>setConfirmCancel(e.target.checked)} disabled={busy}/>
        Confirmo o cancelamento da reserva. O horário será liberado; pagamentos não serão alterados.
       </label>
       <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
        <button type="button" style={secondary} disabled={busy} onClick={()=>setAction(null)}>Voltar</button>
        <button type="button" style={{...primary,background:'#ad2540'}} disabled={busy||!confirmCancel||reason.trim().length<5} onClick={()=>void manageReservation()}>{busy?'Cancelando...':'Confirmar cancelamento'}</button>
       </div>
      </div>}
      {!reservation.crm_event_id&&!action&&<div style={{padding:12,border:'1px solid #e7ce96',background:'#fff8e9',borderRadius:9,display:'grid',gap:8}}>
       <strong style={{fontSize:13}}>Evento operacional ainda não vinculado</strong>
       <p style={{fontSize:12,margin:0}}>A reserva está salva. Vincule-a ao evento antes de registrar a conclusão, sem duplicar a apresentação.</p>
       {!confirmOperational?<button type="button" style={secondary} onClick={()=>setConfirmOperational(true)} disabled={busy}>Preparar vínculo operacional</button>:
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',flexWrap:'wrap'}}>
         <button type="button" style={secondary} disabled={busy} onClick={()=>setConfirmOperational(false)}>Voltar</button>
         <button type="button" style={primary} disabled={busy} onClick={()=>void linkOperationalEvent()}>{busy?'Vinculando...':'Confirmar vínculo'}</button>
        </div>}
      </div>}
     </div>}
   </div>}
   {!loading&&!reservation&&!proposal&&<p role="alert">Proposta não habilitada para reserva. Verifique o aceite e a situação da instituição.</p>}
   {!loading&&!reservation&&proposal&&!proposal.mapped&&<div style={{padding:14,border:'1px solid #efd3a3',background:'#fff7e8',borderRadius:10}}>
    <p style={{margin:'0 0 10px'}}>Antes da reserva, esta instituição precisa ser vinculada à operação.</p>
    {!confirmLink?<button type="button" disabled={!enabled||busy}
     onClick={()=>setConfirmLink(true)} style={secondary}>Vincular instituição</button>:
     <div role="group" aria-label="Confirmação do vínculo operacional"
      style={{border:'1px solid #b8d3f3',background:'#f0f7ff',borderRadius:10,padding:12,display:'grid',gap:10}}>
      <strong style={{fontSize:13}}>Confirmar vínculo operacional?</strong>
      <p style={{margin:0,fontSize:12}}>A instituição <strong>{institution}</strong> será vinculada à operação.
       O vínculo ficará salvo no banco e não será removido automaticamente. Confirme somente se for uma instituição real.</p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}}>
       <button type="button" disabled={busy} onClick={()=>setConfirmLink(false)} style={secondary}>Voltar</button>
       <button type="button" disabled={busy} onClick={()=>void linkClient()} style={primary}>
        {busy?'Vinculando...':'Confirmar vínculo'}
       </button>
      </div>
     </div>}
    {!confirmLink&&<p style={{margin:'9px 0 0',fontSize:12}}>O vínculo será salvo no banco. Não utilize dados fictícios em operação real.</p>}
   </div>}
   {!loading&&!reservation&&proposal?.mapped&&<form id="service-booking-form" onSubmit={e=>void submit(e)}
    style={{display:'grid',gap:13}}>
    <label style={{fontSize:13,fontWeight:750}}>Cúpula disponível
     <select required disabled={!enabled||busy} value={domeId} onChange={e=>setDomeId(e.target.value)}
      style={{...field,marginTop:5}}>
      <option value="">Selecionar cúpula</option>
      {domes.map(d=><option key={d.id} value={d.id} disabled={Boolean(proposal?.expected_attendees&&d.capacity!=null&&Number(proposal.expected_attendees)>Number(d.capacity))}>{d.name}{d.capacity?' · até '+d.capacity+' pessoas':''}</option>)}
     </select>
    </label>
    {domes.length===0&&<p role="status" style={{color:'#92400e',fontSize:12}}>
     Nenhuma cúpula ativa vinculada à operação. Confira o cadastro de cúpulas.
    </p>}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(195px,1fr))',gap:12}}>
     <label style={{fontSize:13,fontWeight:750}}>Início da apresentação
      <input type="datetime-local" required disabled={!enabled||busy}
       value={start} onChange={e=>setStart(e.target.value)} style={{...field,marginTop:5}}/>
     </label>
     <label style={{fontSize:13,fontWeight:750}}>Término da apresentação
      <input type="datetime-local" required disabled={!enabled||busy}
       value={end} onChange={e=>setEnd(e.target.value)} style={{...field,marginTop:5}}/>
     </label>
    </div>
    {!capacityOk&&<p role="alert" style={{margin:0,color:'#a02135',fontSize:12}}>Esta cúpula não comporta o público previsto. Selecione outra cúpula.</p>}
    {conflicting&&<p role="alert" style={{margin:0,color:'#a02135',fontSize:12}}>
     Esta cúpula já possui apresentação no intervalo escolhido. Selecione outro horário ou cúpula.
    </p>}
    {start&&end&&!validDates&&<p role="status" style={{margin:0,color:'#9a661e',fontSize:12}}>
     O término deve ser posterior ao início e a apresentação precisa ser futura.
    </p>}
    {validDates&&selectedDome&&!conflicting&&<div style={{background:'#e8f2ff',border:'1px solid #c9ddf7',padding:12,borderRadius:10}}>
     <strong>Confira antes de salvar</strong>
     <p style={{margin:'6px 0 0',fontSize:12}}>{institution} · {selectedDome.name}</p>
     <p style={{margin:'3px 0 0',fontSize:12}}>{fmt(startDate!.toISOString())} até {fmt(endDate!.toISOString())}</p>
    </div>}
    {!enabled&&<p role="alert">A gravação de reservas não está habilitada no momento.</p>}
    <div style={{display:'flex',gap:9,justifyContent:'flex-end',flexWrap:'wrap'}}>
     <button type="button" onClick={onClose} disabled={busy} style={secondary}>Cancelar</button>
     <button type="submit" disabled={!canSave} style={{...primary,opacity:canSave?1:.5}}>
      {busy?'Registrando...':'Confirmar reserva'}
     </button>
    </div>
   </form>}
   {!loading&&(!proposal?.mapped||reservation)&&
    <button type="button" disabled={busy} onClick={onClose} style={secondary}>Fechar</button>}
  </div>
 </dialog>;
}
