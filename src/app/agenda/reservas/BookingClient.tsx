'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
type Proposal={id:string;title:string;client_name:string;mapped:boolean};
type Dome={id:string;name:string;capacity:number|null;mapped:boolean};
type Booking={proposal_id:string;presentation_id:string;starts_at:string;ends_at:string;status:string;dome_name:string|null};
export default function BookingClient({enabled}:{enabled:boolean}){
 const [data,setData]=useState<{proposals:Proposal[];domes:Dome[];links:Booking[]}|null>(null);
 const [status,setStatus]=useState('Carregando...'),[busy,setBusy]=useState(false);
 const [detailId,setDetailId]=useState<string|null>(null);
 const [modalError,setModalError]=useState('');
 const [editMode,setEditMode]=useState(false),[editDome,setEditDome]=useState(''),[editStart,setEditStart]=useState(''),[editEnd,setEditEnd]=useState('');
 const [query,setQuery]=useState(''),[year,setYear]=useState('all'),[month,setMonth]=useState('all'),[stateFilter,setStateFilter]=useState('all'),[sort,setSort]=useState('desc'),[page,setPage]=useState(1);
 const [proposalId,setProposalId]=useState(''),[domeId,setDomeId]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState('');
 async function load(){const r=await fetch('/api/agenda/reservas',{cache:'no-store'});const v=await r.json();if(!r.ok)throw Error(v.error||'Consulta falhou');setData(v);}
 useEffect(()=>{load().then(()=>setStatus('')).catch(e=>setStatus(e.message));},[]);
 const eligible=data?.proposals.filter(p=>p.mapped&&!data.links.some(l=>l.proposal_id===p.id))||[];
 const domes=data?.domes.filter(d=>d.mapped)||[];
 const selectedBooking=data?.links.find(l=>l.presentation_id===detailId);
 const selectedProposal=data?.proposals.find(p=>p.id===selectedBooking?.proposal_id);
 const bookings=useMemo(()=>{const rows=(data?.links||[]).map(b=>({...b,proposal:data?.proposals.find(p=>p.id===b.proposal_id)}));return rows.filter(b=>{const d=new Date(b.starts_at);return (year==='all'||String(d.getFullYear())===year)&&(month==='all'||String(d.getMonth()+1)===month)&&(stateFilter==='all'||b.status===stateFilter)&&(!query||[b.proposal?.client_name,b.proposal?.title,b.dome_name].some(v=>v?.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))));}).sort((a,b)=>sort==='asc'?new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime():new Date(b.starts_at).getTime()-new Date(a.starts_at).getTime());},[data,year,month,stateFilter,query,sort]);
 const years=Array.from(new Set((data?.links||[]).map(b=>String(new Date(b.starts_at).getFullYear())))).sort((a,b)=>b.localeCompare(a));
 const pageCount=Math.max(1,Math.ceil(bookings.length/10));const currentPage=Math.min(page,pageCount);
 const localInput=(value:string)=>{const d=new Date(value);const p=(n:number)=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;};
 function openDetails(id:string){setDetailId(id);setEditMode(false);setModalError('');const b=data?.links.find(x=>x.presentation_id===id);if(b){setEditStart(localInput(b.starts_at));setEditEnd(localInput(b.ends_at));setEditDome(data?.domes.find(d=>d.name===b.dome_name)?.id||'');}}
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
 if(!proposalId||!domeId||!start||!end||!Number.isFinite(new Date(start).getTime())||!Number.isFinite(new Date(end).getTime())||new Date(end)<=new Date(start)){setStatus('Confira a proposta, a cúpula e os horários: término deve ser posterior ao início.');return;}
 const chosen=data?.proposals.find(p=>p.id===proposalId);
 const chosenDome=data?.domes.find(d=>d.id===domeId);
 if(!chosen?.mapped||!chosenDome?.mapped||data?.links.some(l=>l.proposal_id===proposalId)){
  setStatus('Proposta ou cúpula indisponível para reserva. Atualize a página.');return;
 }
 const fmt=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'});
  const confirmed=window.confirm(['Confirmar reserva permanente?','','Instituição: '+chosen.client_name,'Proposta: '+chosen.title,'Cúpula: '+chosenDome.name,'Início: '+fmt.format(new Date(start)),'Término: '+fmt.format(new Date(end)),'','A reserva ficará registrada no histórico do CRM.'].join(String.fromCharCode(10)));
 if(!confirmed)return;
 setBusy(true);setStatus('');
 try{const r=await fetch('/api/agenda/reservas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({proposalId,domeId,start:new Date(start).toISOString(),end:new Date(end).toISOString()})});const v=await r.json();if(!r.ok)throw Error(v.error||'Reserva não registrada');await load();setStatus('Reserva registrada. Consulte a Agenda.');setProposalId('');setDomeId('');}
 catch(e){setStatus(e instanceof Error?e.message:'Erro');}finally{setBusy(false)}}
 return <main className="booking-refined">
 <div className="booking-heading"><div><h1>Reservas</h1><p>Agende apresentações com cúpulas e instituições vinculadas.</p></div></div>
 {status&&<p role="status" className="booking-status">{status}</p>}
 <section className="booking-panel" aria-labelledby="booking-readiness-heading">
  <div className="booking-section-heading"><h2 id="booking-readiness-heading">Resumo das reservas</h2><span className="booking-pill">{enabled?'Cadastro disponível':'Somente consulta'}</span></div>
  <div className="booking-metrics">
   <div><span>Propostas aceitas</span><strong>{data?.proposals.length??'—'}</strong></div>
   <div><span>Clientes vinculados</span><strong>{data?.proposals.filter(x=>x.mapped).length??'—'}</strong></div>
   <div><span>Cúpulas vinculadas</span><strong>{domes.length}</strong></div>
   <div><span>Reservas registradas</span><strong>{data?.links.length??'—'}</strong></div>
  </div>
  <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:16,marginBottom:12}}>
   <input aria-label="Buscar reservas" placeholder="Buscar instituição, proposta ou cúpula" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} style={{flex:'2 1 220px',minWidth:160,padding:10,borderRadius:8,border:'1px solid #bdcce4'}}/>
   <select aria-label="Ano" value={year} onChange={e=>{setYear(e.target.value);setPage(1)}} style={{padding:10,borderRadius:8}}><option value="all">Todos os anos</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
   <select aria-label="Mês" value={month} onChange={e=>{setMonth(e.target.value);setPage(1)}} style={{padding:10,borderRadius:8}}><option value="all">Todos os meses</option>{Array.from({length:12},(_,i)=><option key={i} value={String(i+1)}>{new Intl.DateTimeFormat('pt-BR',{month:'long'}).format(new Date(2026,i,1))}</option>)}</select>
   <select aria-label="Situação" value={stateFilter} onChange={e=>{setStateFilter(e.target.value);setPage(1)}} style={{padding:10,borderRadius:8}}><option value="all">Todas as situações</option><option value="reserved">Reservadas</option><option value="confirmed">Confirmadas</option><option value="completed">Concluídas</option><option value="cancelled">Canceladas</option></select>
   <select aria-label="Ordenação" value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}} style={{padding:10,borderRadius:8}}><option value="desc">Mais recentes</option><option value="asc">Mais antigas</option></select>
  </div>
  <div className="booking-readiness-list">{bookings.slice((currentPage-1)*10,currentPage*10).map(b=><div key={b.presentation_id} className="booking-readiness-row"><div><strong>{b.proposal?.client_name||'Instituição não identificada'}</strong><span>{b.proposal?.title||'Proposta não identificada'} · {formatDate(b.starts_at)} · {b.dome_name||'Cúpula não informada'}</span></div><div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}><span className="booking-ready">{b.status==='reserved'?'Reservada':b.status==='confirmed'?'Confirmada':b.status==='completed'?'Concluída':b.status==='cancelled'?'Cancelada':b.status}</span><button type="button" onClick={()=>openDetails(b.presentation_id)} style={{border:'1px solid #b7cbee',background:'#fff',color:'#1d4ed8',padding:'7px 12px',borderRadius:8,cursor:'pointer'}}>Ver detalhes</button></div></div>)}</div>
  {data&&bookings.length===0&&<p className="booking-empty">Nenhuma reserva encontrada para os filtros selecionados.</p>}
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginTop:12,flexWrap:'wrap'}}><span style={{fontSize:13}}>Exibindo {bookings.length?((currentPage-1)*10+1):0}–{Math.min(currentPage*10,bookings.length)} de {bookings.length} reservas</span><div style={{display:'flex',alignItems:'center',gap:8}}><button type="button" disabled={currentPage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</button><span>{currentPage} de {pageCount}</span><button type="button" disabled={currentPage>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}>Próxima</button></div></div>
  {data?.domes.length?<p className="booking-dome-names">Cúpulas: {data.domes.map(d=>d.name+(d.mapped?' ✓':' — vínculo pendente')).join(' · ')}</p>:data&&<p className="booking-empty">Ainda não há cúpulas cadastradas. Utilize a página Cúpulas para consultar a estrutura.</p>}
  {!enabled&&<p className="booking-readonly">Os agendamentos ainda não estão liberados para gravação. A configuração será validada antes da entrega.</p>}
 </section>
 {enabled&&data&&data.proposals.some(p=>!p.mapped)&&<section style={{border:'1px solid #bdcce4',padding:18,borderRadius:12,marginTop:20,display:'grid',gap:12}}>
 <h2>Preparar cadastros para a primeira reserva</h2>
 <p>Vincule a instituição da proposta aceita. Cadastre a cúpula na área Cúpulas.</p>
 {data.proposals.filter(p=>!p.mapped).map(p=><button disabled={busy} key={p.id} onClick={()=>prepare({action:'link-client',proposalId:p.id})} style={{padding:12}}>Vincular cliente: {p.client_name}</button>)}
 <p className="booking-empty">O cadastro e o gerenciamento de cúpulas ficam na área própria, para evitar registros duplicados.</p>
 <Link href="/operacao/cupulas" className="booking-calendar-link">Gerenciar cúpulas ↗</Link>
 </section>}
 {enabled&&eligible.length>0&&domes.length>0&&<form onSubmit={submit} className="booking-panel booking-form">
 <h2>Reservar apresentação</h2><label>Proposta<select required value={proposalId} onChange={e=>setProposalId(e.target.value)} style={{display:'block',padding:10,width:'100%'}}><option value="">Selecione</option>{eligible.map(p=><option key={p.id} value={p.id}>{p.client_name} — {p.title}</option>)}</select></label>
 <label>Cúpula<select required value={domeId} onChange={e=>setDomeId(e.target.value)} style={{display:'block',padding:10,width:'100%'}}><option value="">Selecione</option>{domes.map(d=><option key={d.id} value={d.id}>{d.name}{d.capacity?' · capacidade '+d.capacity:''}</option>)}</select></label>
 <label>Início<input required type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} style={{display:'block',padding:10,width:'100%'}}/></label>
 <label>Término<input required type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} style={{display:'block',padding:10,width:'100%'}}/></label>
 <button disabled={busy||!proposalId||!domeId||!start||!end||new Date(end)<=new Date(start)} style={{padding:12,color:'white',background:'#1d4ed8',border:0,borderRadius:8}}>{busy?'Salvando...':'Registrar reserva'}</button>
 </form>}
 {selectedBooking&&<div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setDetailId(null)}} style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(10,27,57,.55)',display:'grid',placeItems:'center',padding:16}}><section role="dialog" aria-modal="true" aria-labelledby="booking-detail-title" style={{background:'#fff',color:'#19345f',borderRadius:14,padding:24,width:'min(100%,480px)',boxShadow:'0 18px 50px rgba(0,0,0,.2)'}}><h2 id="booking-detail-title" style={{marginTop:0}}>Detalhes da reserva</h2><p><strong>Instituição:</strong> {selectedProposal?.client_name||'Não identificada'}</p><p><strong>Proposta:</strong> {selectedProposal?.title||'Não identificada'}</p><p><strong>Cúpula:</strong> {selectedBooking.dome_name||'Não informada'}</p><p><strong>Início:</strong> {formatDate(selectedBooking.starts_at)}</p><p><strong>Término:</strong> {formatDate(selectedBooking.ends_at)}</p><p><strong>Situação:</strong> {selectedBooking.status==='reserved'?'Reservada':selectedBooking.status==='cancelled'?'Cancelada':selectedBooking.status}</p>
 {modalError&&<p role="alert" style={{padding:10,borderRadius:8,background:'#fff1f2',color:'#9f1239'}}>{modalError}</p>}
 {editMode&&<div style={{display:'grid',gap:10,margin:'14px 0'}}><label>Cúpula<select value={editDome} onChange={e=>setEditDome(e.target.value)} style={{display:'block',width:'100%',padding:10}}>{!editDome&&<option value="">Selecione a cúpula</option>}{domes.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label>Início<input type="datetime-local" value={editStart} onChange={e=>setEditStart(e.target.value)} style={{display:'block',width:'100%',padding:10}}/></label><label>Término<input type="datetime-local" value={editEnd} onChange={e=>setEditEnd(e.target.value)} style={{display:'block',width:'100%',padding:10}}/></label></div>}
 <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:18}}>
 {enabled&&selectedBooking.status!=='cancelled'&&<><button type="button" disabled={busy} onClick={()=>editMode?void changeBooking('edit'):setEditMode(true)} style={{background:'#1d4ed8',color:'#fff',border:0,borderRadius:8,padding:'10px 16px',cursor:'pointer'}}>{busy?'Aguarde...':editMode?'Salvar alteração':'Editar reserva'}</button>{!editMode&&<button type="button" disabled={busy} onClick={()=>void changeBooking('cancel')} style={{background:'#fff',color:'#b91c1c',border:'1px solid #fecaca',borderRadius:8,padding:'10px 16px',cursor:'pointer'}}>Cancelar reserva</button>}</>}
 <button type="button" disabled={busy} onClick={()=>{if(editMode)setEditMode(false);else setDetailId(null)}} style={{background:'#e8eef8',color:'#19345f',border:0,borderRadius:8,padding:'10px 16px',cursor:'pointer'}}>{editMode?'Voltar aos detalhes':'Fechar detalhes'}</button>
 </div></section></div>}
 </main>;
}
