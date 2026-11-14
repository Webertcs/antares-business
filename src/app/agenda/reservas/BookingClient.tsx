'use client';
import {useEffect,useMemo,useState} from 'react';
type Proposal={id:string;title:string;client_name:string;mapped:boolean};
type Dome={id:string;name:string;capacity:number|null;mapped:boolean};
type AuditEntry={id:string;presentation_id:string;action:string;old_start:string|null;new_start:string|null;old_end:string|null;new_end:string|null;old_status:string|null;new_status:string|null;changed_at:string};
type Booking={dome_id:string|null;proposal_id:string;presentation_id:string;starts_at:string;ends_at:string;status:string;dome_name:string|null};
export default function BookingClient({enabled}:{enabled:boolean}){
 const [data,setData]=useState<{proposals:Proposal[];domes:Dome[];links:Booking[]}|null>(null);
 const [status,setStatus]=useState('Carregando...'),[busy,setBusy]=useState(false);
 const [detailId,setDetailId]=useState<string|null>(null);
 const [newOpen,setNewOpen]=useState(false);
 const [modalError,setModalError]=useState('');
 const [confirmBooking,setConfirmBooking]=useState(false);
 const [history,setHistory]=useState<AuditEntry[]>([]),[historyStatus,setHistoryStatus]=useState('');
 const [showHistory,setShowHistory]=useState(false);
 const [editMode,setEditMode]=useState(false),[editDome,setEditDome]=useState(''),[editStart,setEditStart]=useState(''),[editEnd,setEditEnd]=useState('');
 const [query,setQuery]=useState(''),[year,setYear]=useState('all'),[month,setMonth]=useState('all'),[stateFilter,setStateFilter]=useState('all'),[sort,setSort]=useState('desc'),[page,setPage]=useState(1);
 const [proposalId,setProposalId]=useState(''),[domeId,setDomeId]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState('');
 async function load(){const r=await fetch('/api/agenda/reservas',{cache:'no-store'});const v=await r.json();if(!r.ok)throw Error(v.error||'Consulta falhou');setData(v);}
 useEffect(()=>{load().then(()=>setStatus('')).catch(e=>setStatus(e.message));},[]);
 useEffect(()=>{
  const target=new URLSearchParams(window.location.search).get('proposalId');
  if(!target||!data)return;
  window.history.replaceState(null,'',window.location.pathname);
  if(!enabled){setStatus('Agendamento indisponível no momento.');return;}
  const proposal=data.proposals.find(p=>p.id===target);
  if(!proposal){setStatus('Proposta não encontrada para agendamento.');return;}
  if(data.links.some(l=>l.proposal_id===target)){setStatus('Esta proposta já possui uma reserva.');return;}
  if(!proposal.mapped){setStatus('Antes de agendar, vincule esta instituição à operação.');return;}
  setProposalId(target);setDomeId('');setStart('');setEnd('');
  setModalError('');setConfirmBooking(false);setNewOpen(true);setStatus('');
 },[data,enabled]);

 const eligible=data?.proposals.filter(p=>p.mapped&&!data.links.some(l=>l.proposal_id===p.id))||[];
 const domes=data?.domes.filter(d=>d.mapped)||[];
 const selectedBooking=data?.links.find(l=>l.presentation_id===detailId);
 const selectedProposal=data?.proposals.find(p=>p.id===selectedBooking?.proposal_id);
 const bookings=useMemo(()=>{const rows=(data?.links||[]).map(b=>({...b,proposal:data?.proposals.find(p=>p.id===b.proposal_id)}));return rows.filter(b=>{const d=new Date(b.starts_at);return (year==='all'||String(d.getFullYear())===year)&&(month==='all'||String(d.getMonth()+1)===month)&&(stateFilter==='all'||b.status===stateFilter)&&(!query||[b.proposal?.client_name,b.proposal?.title,b.dome_name].some(v=>v?.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))));}).sort((a,b)=>sort==='asc'?new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime():new Date(b.starts_at).getTime()-new Date(a.starts_at).getTime());},[data,year,month,stateFilter,query,sort]);
 const years=Array.from(new Set((data?.links||[]).map(b=>String(new Date(b.starts_at).getFullYear())))).sort((a,b)=>b.localeCompare(a));
 const pageCount=Math.max(1,Math.ceil(bookings.length/10));const currentPage=Math.min(page,pageCount);
 const localInput=(value:string)=>{const d=new Date(value);const p=(n:number)=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;};
 async function openHistory(){setShowHistory(true);setHistoryStatus('Carregando histórico...');try{const r=await fetch('/api/agenda/reservas/historico',{cache:'no-store'});const v=await r.json();if(!r.ok)throw Error(v.error||'Histórico indisponível');setHistory(v.entries||[]);setHistoryStatus(v.ready?'':'O histórico de alterações ainda não está disponível.');}catch(e){setHistoryStatus(e instanceof Error?e.message:'Histórico indisponível');}}
 function openDetails(id:string){setDetailId(id);setEditMode(false);setModalError('');const b=data?.links.find(x=>x.presentation_id===id);if(b){setEditStart(localInput(b.starts_at));setEditEnd(localInput(b.ends_at));setEditDome(b.dome_id||'');}}
 async function changeBooking(action:'edit'|'cancel'){
  if(!selectedBooking||busy||!enabled)return;
  const body:Record<string,string>={action,presentationId:selectedBooking.presentation_id};
  if(action==='edit'){
   if(!editDome||!editStart||!editEnd||new Date(editEnd)<=new Date(editStart)){setModalError('Confira a cúpula e os horários da edição.');return;}
   body.domeId=editDome;body.start=new Date(editStart).toISOString();body.end=new Date(editEnd).toISOString();
   if(!window.confirm('Confirmar alteração desta reserva? A Agenda será atualizada e a mudança deverá ficar registrada no histórico.'))return;
  }else{
   if(!window.confirm('Cancelar esta reserva? A operação deverá preservar o histórico e não poderá ser desfeita por este botão.'))return;
   body.confirm='CANCELAR';
  }
  setBusy(true);setStatus('');setModalError('');
  try{const r=await fetch('/api/agenda/reservas',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const v=await r.json();if(!r.ok)throw Error(v.error||'Operação recusada');await load();setDetailId(null);setEditMode(false);setStatus(action==='edit'?'Reserva atualizada.':'Reserva cancelada e preservada no histórico.');}
  catch(e){setModalError(e instanceof Error?e.message:'Não foi possível alterar a reserva.');}
  finally{setBusy(false);}
 }
 const formatDate=(value:string)=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(value));
 async function prepare(body:Record<string,unknown>){if(!enabled||busy)return;if(!window.confirm('Vincular este cliente à operação? O cadastro ficará salvo no banco e não será removido automaticamente. Não use uma instituição fictícia.'))return;setBusy(true);setStatus('');try{const response=await fetch('/api/agenda/preparar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível preparar a Agenda');await load();setStatus('Cadastro preparado para a Agenda.');}catch(e){setStatus(e instanceof Error?e.message:'Erro');}finally{setBusy(false);}}
 async function submit(e:React.FormEvent){e.preventDefault();if(!enabled||busy)return;
 setModalError('');
 if(!proposalId||!domeId||!start||!end||!Number.isFinite(new Date(start).getTime())||!Number.isFinite(new Date(end).getTime())||new Date(end)<=new Date(start)){setModalError('Confira a proposta, a cúpula e os horários: término deve ser posterior ao início.');return;}
 const chosen=data?.proposals.find(p=>p.id===proposalId);
 const chosenDome=data?.domes.find(d=>d.id===domeId);
 if(!chosen?.mapped||!chosenDome?.mapped||data?.links.some(l=>l.proposal_id===proposalId)){
  setModalError('Proposta ou cúpula indisponível para reserva. Atualize a página.');return;
 }
 setConfirmBooking(true);
 }
 async function submitConfirmed(){if(!enabled||busy)return;
 setBusy(true);setStatus('');setModalError('');
 try{const r=await fetch('/api/agenda/reservas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({proposalId,domeId,start:new Date(start).toISOString(),end:new Date(end).toISOString()})});const v=await r.json();if(!r.ok)throw Error(v.error||'Reserva não registrada');await load();setStatus('Reserva registrada com sucesso! Consulte a Agenda.');setProposalId('');setDomeId('');setStart('');setEnd('');setNewOpen(false);}
 catch(e){setModalError(e instanceof Error?e.message:'Não foi possível registrar a reserva.');}finally{setBusy(false)}}
 return <main className="booking-refined">
 <style>{`
 .booking-refined{color:#173d77}
 .booking-refined .booking-new-button{background:linear-gradient(105deg,#1d4ed8,#1377d4);color:white;border:0;border-radius:9px;padding:10px 16px;font-weight:750;box-shadow:0 5px 13px rgba(29,78,216,.2)}
 .booking-refined .booking-new-button:hover{filter:brightness(1.08)}
 .booking-refined .booking-panel{background:linear-gradient(145deg,#f7fbff 0%,#e7f1ff 100%);border:1px solid #bdd5f6;border-radius:16px;box-shadow:0 10px 25px rgba(27,78,153,.12);padding:18px}
 .booking-refined .booking-section-heading h2{color:#154987;font-weight:800}
 .booking-refined .booking-metrics>div{background:linear-gradient(155deg,#fff,#eaf3ff);border:1px solid #c3d9f7;border-radius:12px;box-shadow:0 5px 13px rgba(29,78,156,.09);padding:14px}
 .booking-refined .booking-metrics strong{color:#174c9a}
 .booking-refined .booking-readiness-row{background:linear-gradient(145deg,#fff,#f1f7ff);border:1px solid #c3d8f5;border-radius:12px;box-shadow:0 4px 12px rgba(27,74,143,.09);padding:12px}
 .booking-refined button:not(:disabled){cursor:pointer}
 .booking-refined button:disabled{opacity:.5;cursor:not-allowed}
 .booking-refined .booking-panel button:not(:disabled):hover{filter:brightness(.96);box-shadow:0 3px 10px rgba(26,76,150,.16)}
 .booking-refined input,.booking-refined select{background:#fff;border:1px solid #b8d0f2;border-radius:9px;color:#204778;box-shadow:0 2px 6px rgba(35,84,155,.05)}
 .booking-refined .booking-pill{background:#dbeafe;color:#1e4e9d;border-radius:999px;padding:6px 10px;font-weight:700}
 .booking-refined .booking-calendar-link{background:linear-gradient(100deg,#1d4ed8,#1767cf);color:#fff;border:0;border-radius:10px;box-shadow:0 5px 13px rgba(29,78,216,.22);text-align:center;padding:10px 14px}
 .booking-refined .booking-form>button{box-shadow:0 5px 12px rgba(29,78,216,.2);font-weight:700}
 .booking-refined .booking-pagination-button{border:1px solid #b5cff6;border-radius:8px;padding:8px 13px;background:#e6f0ff;color:#1854a5;font-weight:700}
 .booking-refined .booking-history-button{background:linear-gradient(110deg,#1d4ed8,#2873d5);color:#fff;border:0;border-radius:9px;padding:10px 16px;font-weight:700;box-shadow:0 5px 13px rgba(29,78,216,.18)}
 .booking-refined .booking-secondary-panel{background:linear-gradient(150deg,#f8fbff,#e9f3ff);border:1px solid #bfd5f5;border-radius:14px;box-shadow:0 7px 18px rgba(27,78,153,.1);padding:18px;margin-top:20px;display:grid;gap:12px}
 `}</style>
 {status&&<p role="status" className="booking-status">{status}</p>}
 <section className="booking-panel" aria-labelledby="booking-readiness-heading">
  <div className="booking-section-heading" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><h2 id="booking-readiness-heading">Resumo das reservas</h2><div style={{display:"flex",gap:10,alignItems:"center"}}>{enabled&&<button type="button" className="booking-new-button" onClick={()=>{setNewOpen(true);setStatus('');setModalError('');setConfirmBooking(false);}}>+ Nova reserva</button>}{!enabled&&<span className="booking-pill">Somente consulta</span>}</div></div>
  <div className="booking-metrics">
   <div><span>Propostas aceitas</span><strong>{data?.proposals.length??'—'}</strong></div>
   <div><span>Clientes vinculados</span><strong>{data?.proposals.filter(x=>x.mapped).length??'—'}</strong></div>
   <div><span>Cúpulas vinculadas</span><strong>{domes.length}</strong></div>
   <div><span>Reservas registradas</span><strong>{data?.links.length??'—'}</strong></div>
  </div>
  <div className="operation-premium-booking-filters" style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:16,marginBottom:12}}>
   <input aria-label="Buscar reservas" placeholder="Buscar instituição, proposta ou cúpula" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} style={{flex:'2 1 220px',minWidth:160,padding:10,borderRadius:8,border:'1px solid #bdcce4'}}/>
   <select aria-label="Ano" value={year} onChange={e=>{setYear(e.target.value);setPage(1)}} style={{padding:10,borderRadius:8}}><option value="all">Todos os anos</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
   <select aria-label="Mês" value={month} onChange={e=>{setMonth(e.target.value);setPage(1)}} style={{padding:10,borderRadius:8}}><option value="all">Todos os meses</option>{Array.from({length:12},(_,i)=><option key={i} value={String(i+1)}>{new Intl.DateTimeFormat('pt-BR',{month:'long'}).format(new Date(2026,i,1))}</option>)}</select>
   <select aria-label="Situação" value={stateFilter} onChange={e=>{setStateFilter(e.target.value);setPage(1)}} style={{padding:10,borderRadius:8}}><option value="all">Todas as situações</option><option value="reserved">Reservadas</option><option value="confirmed">Confirmadas</option><option value="completed">Concluídas</option><option value="cancelled">Canceladas</option></select>
   <select aria-label="Ordenação" value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}} style={{padding:10,borderRadius:8}}><option value="desc">Mais recentes</option><option value="asc">Mais antigas</option></select>
  </div>
  <div className="booking-readiness-list">{bookings.slice((currentPage-1)*10,currentPage*10).map(b=><div key={b.presentation_id} className="booking-readiness-row"><div><strong>{b.proposal?.client_name||'Instituição não identificada'}</strong><span>{b.proposal?.title||'Proposta não identificada'} · {formatDate(b.starts_at)} · {b.dome_name||'Cúpula não informada'}</span></div><div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}><span className="booking-ready">{b.status==='reserved'?'Reservada':b.status==='confirmed'?'Confirmada':b.status==='completed'?'Concluída':b.status==='cancelled'?'Cancelada':b.status}</span><button type="button" className="operation-premium-details-button" onClick={()=>openDetails(b.presentation_id)} style={{border:'1px solid #b7cbee',background:'#fff',color:'#1d4ed8',padding:'7px 12px',borderRadius:8,cursor:'pointer'}}>Ver detalhes</button></div></div>)}</div>
  {data&&bookings.length===0&&<p className="booking-empty">Nenhuma reserva encontrada para os filtros selecionados.</p>}
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginTop:12,flexWrap:'wrap'}}><span style={{fontSize:13}}>Exibindo {bookings.length?((currentPage-1)*10+1):0}–{Math.min(currentPage*10,bookings.length)} de {bookings.length} reservas</span><div style={{display:'flex',alignItems:'center',gap:8}}><button type="button" className="booking-pagination-button" disabled={currentPage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</button><span>{currentPage} de {pageCount}</span><button type="button" className="booking-pagination-button" disabled={currentPage>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}>Próxima</button></div></div>
  <div style={{marginTop:14}}><button type="button" className="booking-history-button" onClick={()=>void openHistory()} style={{background:'#e8eefc',color:'#1d4ed8',border:'1px solid #b7cbee',borderRadius:8,padding:'9px 14px',cursor:'pointer'}}>Histórico de alterações</button></div>
  {data?.domes.length?<p className="booking-dome-names">Cúpulas: {data.domes.map(d=>d.name+(d.mapped?' ✓':' — vínculo pendente')).join(' · ')}</p>:data&&<p className="booking-empty">Ainda não há cúpulas cadastradas. Utilize a página Cúpulas para consultar a estrutura.</p>}
  {!enabled&&<p className="booking-readonly">Não é possível criar novas reservas no momento. As reservas existentes continuam disponíveis para consulta.</p>}
 </section>
 {newOpen&&enabled&&<div role="presentation" style={{position:'fixed',inset:0,zIndex:1150,background:'rgba(10,27,57,.58)',display:'grid',placeItems:'center',padding:16}}><section role="dialog" aria-modal="true" aria-labelledby="booking-new-title" style={{background:'linear-gradient(155deg,#ffffff 0%,#eff6ff 58%,#e2eeff 100%)',border:'1px solid #9dc4fa',color:'#19345f',borderRadius:18,padding:22,width:'min(100%,590px)',maxHeight:'88vh',overflowY:'auto',boxShadow:'0 20px 55px rgba(8,35,83,.25)'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,background:'linear-gradient(110deg,#123b82,#176dd0)',color:'#fff',borderRadius:12,padding:'14px 16px',marginBottom:16,boxShadow:'0 7px 18px rgba(23,85,169,.22)'}}><h2 id="booking-new-title" style={{margin:0,color:'#fff',fontSize:19}}>Nova reserva</h2><button type="button" disabled={busy} aria-label="Fechar nova reserva" onClick={()=>{setNewOpen(false);setConfirmBooking(false);setModalError('');}} style={{border:'1px solid #a9cdf9',background:'#e9f2ff',color:'#154987',borderRadius:8,padding:'7px 11px',fontWeight:700}}>Fechar</button></div>
 {data?.proposals.some(p=>!p.mapped)&&<div className="booking-secondary-panel"><h3 style={{margin:0}}>Propostas aguardando vinculação</h3><p style={{margin:0}}>Vincule a instituição para liberar a proposta para reserva.</p>{data.proposals.filter(p=>!p.mapped).map(p=><button type="button" disabled={busy} key={p.id} onClick={()=>prepare({action:'link-client',proposalId:p.id})} style={{padding:11,border:'1px solid #bcd4f4',borderRadius:9,background:'#e4efff',color:'#154987',fontWeight:700}}>Vincular instituição: {p.client_name}</button>)}</div>}
  {modalError&&<p role="alert" style={{padding:12,margin:'12px 0',borderRadius:9,background:'#fff1f2',border:'1px solid #fecdd3',color:'#9f1239',fontWeight:650}}>{modalError}</p>}
  {eligible.length>0&&domes.length>0&&<form onSubmit={submit} className="booking-panel booking-form" style={{background:'linear-gradient(160deg,#f7fbff,#eaf3ff)',border:'1px solid #b7d3fa',boxShadow:'0 8px 22px rgba(22,81,161,.12)',borderRadius:13,padding:16}}>
 <h2 style={{color:'#164d9d',fontSize:17,margin:'0 0 12px'}}>Reservar apresentação</h2><label>Proposta<select required value={proposalId} onChange={e=>setProposalId(e.target.value)} style={{display:'block',padding:10,width:'100%'}}><option value="">Selecione</option>{eligible.map(p=><option key={p.id} value={p.id}>{p.client_name} — {p.title}</option>)}</select></label>
 <label>Cúpula<select required value={domeId} onChange={e=>setDomeId(e.target.value)} style={{display:'block',padding:10,width:'100%'}}><option value="">Selecione</option>{domes.map(d=><option key={d.id} value={d.id}>{d.name}{d.capacity?' · capacidade '+d.capacity:''}</option>)}</select></label>
 <label>Início<input required type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} style={{display:'block',padding:10,width:'100%'}}/></label>
 <label>Término<input required type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} style={{display:'block',padding:10,width:'100%'}}/></label>
 <button disabled={busy||!proposalId||!domeId||!start||!end||new Date(end)<=new Date(start)} style={{padding:12,color:'white',background:'linear-gradient(105deg,#1d4ed8,#1377d4)',border:0,borderRadius:9,boxShadow:'0 5px 12px rgba(29,78,216,.24)',fontWeight:750}}>{busy?'Salvando...':'Registrar reserva'}</button>
 </form>}

 {eligible.length===0&&<p style={{padding:12,color:'#315784'}}>Não há propostas aceitas e disponíveis para uma nova reserva. Verifique as propostas e seus vínculos.</p>}
 {domes.length===0&&<p style={{padding:12,color:'#315784'}}>Não há cúpulas ativas e vinculadas disponíveis. Utilize o módulo Cúpulas.</p>}
 </section></div>}
 {confirmBooking&&newOpen&&<div role="presentation" style={{position:'fixed',inset:0,zIndex:1300,background:'rgba(10,27,57,.65)',display:'grid',placeItems:'center',padding:16}}><section role="dialog" aria-modal="true" aria-labelledby="booking-confirm-title" style={{background:'linear-gradient(155deg,#e2efff,#c7ddfb)',border:'2px solid #80adea',borderRadius:16,padding:24,width:'min(100%,470px)',boxShadow:'0 20px 60px rgba(10,35,85,.3)',color:'#103b79'}}><h2 id="booking-confirm-title" style={{margin:'-24px -24px 18px',padding:'17px 24px',borderRadius:'14px 14px 0 0',background:'linear-gradient(105deg,#103675,#1766c4)',color:'#fff',fontSize:19}}>Confirmar reserva</h2><p>Confira os dados antes de registrar:</p><p><strong>Instituição:</strong> {data?.proposals.find(p=>p.id===proposalId)?.client_name}</p><p><strong>Proposta:</strong> {data?.proposals.find(p=>p.id===proposalId)?.title}</p><p><strong>Cúpula:</strong> {data?.domes.find(d=>d.id===domeId)?.name}</p><p><strong>Início:</strong> {start&&formatDate(new Date(start).toISOString())}</p><p><strong>Término:</strong> {end&&formatDate(new Date(end).toISOString())}</p><div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20}}><button type="button" disabled={busy} onClick={()=>setConfirmBooking(false)} style={{border:'1px solid #bcd4f4',background:'#fff',borderRadius:9,padding:'10px 16px',color:'#173d77'}}>Voltar</button><button type="button" disabled={busy} onClick={()=>{setConfirmBooking(false);void submitConfirmed();}} style={{background:'linear-gradient(105deg,#1d4ed8,#1377d4)',color:'#fff',border:0,borderRadius:9,padding:'10px 16px',fontWeight:750}}>{busy?'Registrando...':'Confirmar reserva'}</button></div></section></div>}
 {showHistory&&<div role="presentation" style={{position:'fixed',inset:0,zIndex:1100,background:'rgba(10,27,57,.55)',display:'grid',placeItems:'center',padding:16}}><section role="dialog" aria-modal="true" aria-labelledby="booking-history-title" style={{background:'#fff',color:'#19345f',borderRadius:14,padding:24,width:'min(100%,650px)',maxHeight:'85vh',overflowY:'auto'}}><h2 id="booking-history-title">Histórico de alterações</h2>{historyStatus&&<p role="status">{historyStatus}</p>}{history.length===0&&!historyStatus&&<p>Nenhuma edição ou cancelamento registrado.</p>}{history.map(h=><div key={h.id} style={{borderBottom:'1px solid #dce6f4',padding:'12px 0'}}><strong>{h.action==='edit'?'Reserva editada':'Reserva cancelada'}</strong><p>{formatDate(h.changed_at)}</p>{h.old_start&&<p>Antes: {formatDate(h.old_start)}{h.old_end?' até '+formatDate(h.old_end):''}</p>}{h.new_start&&<p>Depois: {formatDate(h.new_start)}{h.new_end?' até '+formatDate(h.new_end):''}</p>}</div>)}<button type="button" onClick={()=>setShowHistory(false)} style={{background:'#1d4ed8',color:'#fff',border:0,borderRadius:8,padding:'10px 16px',marginTop:14}}>Fechar histórico</button></section></div>}
 {selectedBooking&&<div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!editMode&&!busy)setDetailId(null)}} style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(10,27,57,.55)',display:'grid',placeItems:'center',padding:16}}><section role="dialog" aria-modal="true" aria-labelledby="booking-detail-title" style={{background:'#fff',color:'#19345f',borderRadius:14,padding:24,width:'min(100%,480px)',boxShadow:'0 18px 50px rgba(0,0,0,.2)'}}><h2 id="booking-detail-title" style={{marginTop:0}}>Detalhes da reserva</h2><p><strong>Instituição:</strong> {selectedProposal?.client_name||'Não identificada'}</p><p><strong>Proposta:</strong> {selectedProposal?.title||'Não identificada'}</p><p><strong>Cúpula:</strong> {selectedBooking.dome_name||'Não informada'}</p><p><strong>Início:</strong> {formatDate(selectedBooking.starts_at)}</p><p><strong>Término:</strong> {formatDate(selectedBooking.ends_at)}</p><p><strong>Situação:</strong> {selectedBooking.status==='reserved'?'Reservada':selectedBooking.status==='cancelled'?'Cancelada':selectedBooking.status}</p>
 {modalError&&<p role="alert" style={{padding:10,borderRadius:8,background:'#fff1f2',color:'#9f1239'}}>{modalError}</p>}
 {editMode&&<div style={{display:'grid',gap:10,margin:'14px 0'}}><label>Cúpula<select value={editDome} onChange={e=>setEditDome(e.target.value)} style={{display:'block',width:'100%',padding:10}}>{!editDome&&<option value="">Selecione a cúpula</option>}{domes.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label>Início<input type="datetime-local" value={editStart} onChange={e=>setEditStart(e.target.value)} style={{display:'block',width:'100%',padding:10}}/></label><label>Término<input type="datetime-local" value={editEnd} onChange={e=>setEditEnd(e.target.value)} style={{display:'block',width:'100%',padding:10}}/></label></div>}
 <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:18}}>
 {enabled&&selectedBooking.status!=='cancelled'&&<><button type="button" disabled={busy} onClick={()=>editMode?void changeBooking('edit'):setEditMode(true)} style={{background:'#1d4ed8',color:'#fff',border:0,borderRadius:8,padding:'10px 16px',cursor:'pointer'}}>{busy?'Aguarde...':editMode?'Salvar alteração':'Editar reserva'}</button>{!editMode&&<button type="button" disabled={busy} onClick={()=>void changeBooking('cancel')} style={{background:'#fff',color:'#b91c1c',border:'1px solid #fecaca',borderRadius:8,padding:'10px 16px',cursor:'pointer'}}>Cancelar reserva</button>}</>}
 <button type="button" disabled={busy} onClick={()=>{if(editMode)setEditMode(false);else setDetailId(null)}} style={{background:'#e8eef8',color:'#19345f',border:0,borderRadius:8,padding:'10px 16px',cursor:'pointer'}}>{editMode?'Voltar aos detalhes':'Fechar detalhes'}</button>
 </div></section></div>}
 </main>;
}
