'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Proposal={id:string;title:string;client_name:string;mapped:boolean};
type Dome={id:string;name:string;capacity:number|null;mapped:boolean};
type Booking={proposal_id:string;presentation_id:string};
export default function BookingClient({enabled}:{enabled:boolean}){
 const [data,setData]=useState<{proposals:Proposal[];domes:Dome[];links:Booking[]}|null>(null);
 const [status,setStatus]=useState('Carregando...'),[busy,setBusy]=useState(false);
 const [domeName,setDomeName]=useState(''),[domeCode,setDomeCode]=useState(''),[capacity,setCapacity]=useState(30);
 const [proposalId,setProposalId]=useState(''),[domeId,setDomeId]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState('');
 async function load(){const r=await fetch('/api/agenda/reservas',{cache:'no-store'});const v=await r.json();if(!r.ok)throw Error(v.error||'Consulta falhou');setData(v);}
 useEffect(()=>{load().then(()=>setStatus('')).catch(e=>setStatus(e.message));},[]);
 const eligible=data?.proposals.filter(p=>p.mapped&&!data.links.some(l=>l.proposal_id===p.id))||[];
 const domes=data?.domes.filter(d=>d.mapped)||[];
 async function prepare(body:Record<string,unknown>){if(!enabled||busy)return;setBusy(true);setStatus('');try{const response=await fetch('/api/agenda/preparar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível preparar a Agenda');await load();setStatus('Cadastro preparado para a Agenda.');if(body.action==='create-dome'){setDomeName('');setDomeCode('');setCapacity(30);}}catch(e){setStatus(e instanceof Error?e.message:'Erro');}finally{setBusy(false);}}
 async function submit(e:React.FormEvent){e.preventDefault();if(!enabled||busy)return;
 if(!proposalId||!domeId||!start||!end||!Number.isFinite(new Date(start).getTime())||!Number.isFinite(new Date(end).getTime())||new Date(end)<=new Date(start)){setStatus('Confira a proposta, a cúpula e os horários: término deve ser posterior ao início.');return;}
 setBusy(true);setStatus('');
 try{const r=await fetch('/api/agenda/reservas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({proposalId,domeId,start:new Date(start).toISOString(),end:new Date(end).toISOString()})});const v=await r.json();if(!r.ok)throw Error(v.error||'Reserva não registrada');await load();setStatus('Reserva registrada. Consulte a Agenda.');setProposalId('');setDomeId('');}
 catch(e){setStatus(e instanceof Error?e.message:'Erro');}finally{setBusy(false)}}
 return <main style={{maxWidth:980,margin:'0 auto',padding:24,fontFamily:'system-ui',color:'#16345e'}}>
 <Link href="/operacoes">← Central de Operações</Link><h1>Reservas vinculadas às propostas</h1>
 <p>Uma proposta aceita pode ser vinculada a uma apresentação. Reservas exigem cliente e cúpula correspondentes na estrutura operacional.</p>
 {!enabled&&<p style={{background:'#fff2d6',padding:15,borderRadius:8}}>Gravações de reservas desabilitadas até a homologação. Somente leitura.</p>}
 {status&&<p role="status">{status}</p>}
 <section style={{border:'1px solid #bdcce4',borderRadius:12,padding:18,marginTop:18}}><h2>Pré-requisitos de reserva</h2>
 <p>Propostas aceitas: <strong>{data?.proposals.length??'—'}</strong> · Clientes vinculados: <strong>{data?.proposals.filter(x=>x.mapped).length??'—'}</strong> · Cúpulas vinculadas: <strong>{domes.length}</strong> · Reservas vinculadas: <strong>{data?.links.length??'—'}</strong></p>
 {data?.proposals.map(p=><p key={p.id}>{p.client_name} — {p.title}: <strong>{p.mapped?'Cliente operacional vinculado':'Aguardando vínculo de cliente'}</strong>{data.links.some(l=>l.proposal_id===p.id)?' · Reserva registrada':''}</p>)}
 {data?.domes.map(d=><p key={d.id}>Cúpula {d.name}: {d.mapped?'Vínculo operacional pronto':'Aguardando vínculo operacional'}</p>)}
 {data&&domes.length===0&&<p>Não existem cúpulas aptas a receber reservas. O cadastro e o vínculo de equipamentos são pré-requisitos.</p>}
 </section>
 {enabled&&data&&<section style={{border:'1px solid #bdcce4',padding:18,borderRadius:12,marginTop:20,display:'grid',gap:12}}>
 <h2>Preparar cadastros operacionais</h2>
 <p>Vincule os clientes das propostas aceitas e cadastre uma cúpula real antes da primeira reserva.</p>
 {data.proposals.filter(p=>!p.mapped).map(p=><button disabled={busy} key={p.id} onClick={()=>prepare({action:'link-client',proposalId:p.id})} style={{padding:12}}>Vincular cliente: {p.client_name}</button>)}
 <label>Nome da cúpula<input value={domeName} onChange={e=>setDomeName(e.target.value)} style={{display:'block',padding:10,width:'100%'}}/></label>
 <label>Código da cúpula<input value={domeCode} onChange={e=>setDomeCode(e.target.value)} style={{display:'block',padding:10,width:'100%'}}/></label>
 <label>Capacidade por sessão<input type="number" min={1} max={500} value={capacity} onChange={e=>setCapacity(Number(e.target.value))} style={{display:'block',padding:10,width:'100%'}}/></label>
 <button disabled={busy||domeName.trim().length<2||!domeCode.trim()||!Number.isInteger(capacity)||capacity<1||capacity>500} onClick={()=>prepare({action:'create-dome',name:domeName,code:domeCode,capacity})} style={{padding:12}}>Cadastrar e vincular cúpula</button>
 </section>}
 {enabled&&eligible.length>0&&domes.length>0&&<form onSubmit={submit} style={{marginTop:22,display:'grid',gap:14,border:'1px solid #bdcce4',padding:18,borderRadius:12}}>
 <h2>Reservar apresentação</h2><label>Proposta<select required value={proposalId} onChange={e=>setProposalId(e.target.value)} style={{display:'block',padding:10,width:'100%'}}><option value="">Selecione</option>{eligible.map(p=><option key={p.id} value={p.id}>{p.client_name} — {p.title}</option>)}</select></label>
 <label>Cúpula<select required value={domeId} onChange={e=>setDomeId(e.target.value)} style={{display:'block',padding:10,width:'100%'}}><option value="">Selecione</option>{domes.map(d=><option key={d.id} value={d.id}>{d.name}{d.capacity?' · capacidade '+d.capacity:''}</option>)}</select></label>
 <label>Início<input required type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} style={{display:'block',padding:10,width:'100%'}}/></label>
 <label>Término<input required type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} style={{display:'block',padding:10,width:'100%'}}/></label>
 <button disabled={busy||!proposalId||!domeId||!start||!end||new Date(end)<=new Date(start)} style={{padding:12,color:'white',background:'#1d4ed8',border:0,borderRadius:8}}>{busy?'Salvando...':'Registrar reserva'}</button>
 </form>}
 </main>;
}
