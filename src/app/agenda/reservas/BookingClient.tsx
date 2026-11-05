'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Proposal={id:string;title:string;client_name:string;mapped:boolean};
type Dome={id:string;name:string;capacity:number|null;mapped:boolean};
type Booking={proposal_id:string;presentation_id:string;starts_at:string;ends_at:string;status:string;dome_name:string|null};
export default function BookingClient({enabled}:{enabled:boolean}){
 const [data,setData]=useState<{proposals:Proposal[];domes:Dome[];links:Booking[]}|null>(null);
 const [status,setStatus]=useState('Carregando...'),[busy,setBusy]=useState(false);
 const [detailId,setDetailId]=useState<string|null>(null);
 const [proposalId,setProposalId]=useState(''),[domeId,setDomeId]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState('');
 async function load(){const r=await fetch('/api/agenda/reservas',{cache:'no-store'});const v=await r.json();if(!r.ok)throw Error(v.error||'Consulta falhou');setData(v);}
 useEffect(()=>{load().then(()=>setStatus('')).catch(e=>setStatus(e.message));},[]);
 const eligible=data?.proposals.filter(p=>p.mapped&&!data.links.some(l=>l.proposal_id===p.id))||[];
 const domes=data?.domes.filter(d=>d.mapped)||[];
 const selectedBooking=data?.links.find(l=>l.presentation_id===detailId);
 const selectedProposal=data?.proposals.find(p=>p.id===selectedBooking?.proposal_id);
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
  {data?.proposals.length?<div className="booking-readiness-list">{data.proposals.map(p=>{const booking=data.links.find(l=>l.proposal_id===p.id);return <div key={p.id} className="booking-readiness-row"><div><strong>{p.client_name}</strong><span>{p.title}</span></div><div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}><span className={p.mapped?'booking-ready':'booking-pending'}>{booking?'Reservada':p.mapped?'Cliente vinculado':'Aguardando vínculo'}</span>{booking&&<button type="button" onClick={()=>setDetailId(booking.presentation_id)} style={{border:'1px solid #b7cbee',background:'#fff',color:'#1d4ed8',padding:'7px 12px',borderRadius:8,cursor:'pointer'}}>Ver detalhes</button>}</div></div>})}</div>:data&&<p className="booking-empty">Nenhuma proposta aceita disponível.</p>}
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
 {selectedBooking&&<div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setDetailId(null)}} style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(10,27,57,.55)',display:'grid',placeItems:'center',padding:16}}><section role="dialog" aria-modal="true" aria-labelledby="booking-detail-title" style={{background:'#fff',color:'#19345f',borderRadius:14,padding:24,width:'min(100%,480px)',boxShadow:'0 18px 50px rgba(0,0,0,.2)'}}><h2 id="booking-detail-title" style={{marginTop:0}}>Detalhes da reserva</h2><p><strong>Instituição:</strong> {selectedProposal?.client_name||'Não identificada'}</p><p><strong>Proposta:</strong> {selectedProposal?.title||'Não identificada'}</p><p><strong>Cúpula:</strong> {selectedBooking.dome_name||'Não informada'}</p><p><strong>Início:</strong> {formatDate(selectedBooking.starts_at)}</p><p><strong>Término:</strong> {formatDate(selectedBooking.ends_at)}</p><p><strong>Situação:</strong> {selectedBooking.status==='reserved'?'Reservada':selectedBooking.status}</p><button type="button" autoFocus onClick={()=>setDetailId(null)} style={{background:'#1d4ed8',color:'#fff',border:0,borderRadius:8,padding:'10px 18px',cursor:'pointer'}}>Fechar detalhes</button></section></div>}
 </main>;
}
