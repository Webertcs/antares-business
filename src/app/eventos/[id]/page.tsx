import {redirect,notFound} from 'next/navigation';
import {requireMember,getDb} from '@/lib/equipe/auth';
import Link from 'next/link';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export default async function Page({params}:{params:Promise<{id:string}>}){
 const ctx=await requireMember();if(!ctx)redirect('/sem-acesso');
 const {id}=await params;if(!uuid.test(id))notFound();
 const db=getDb();
 const rows=await db`SELECT e.id,e.title,e.event_date,e.start_time,e.end_time,e.status,e.venue,e.notes,e.expected_attendees,
 c.name AS client_name,c.city,c.phone AS client_phone,d.name AS dome_name
 FROM public.crm_events e JOIN public.crm_clients c ON c.id=e.client_id AND c.organization_id=e.organization_id
 LEFT JOIN public.antares_domes d ON d.id=e.dome_id AND d.organization_id=e.organization_id
 WHERE e.id=${id} AND e.organization_id=${ctx.organizationId} LIMIT 1`;
 if(!rows.length)notFound();const e=rows[0];
 const address=String(e.venue||'').trim();
 const maps='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(address);
 const waze='https://waze.com/ul?q='+encodeURIComponent(address)+'&navigate=yes';
 const date=(()=>{if(!e.event_date)return 'A definir';const raw=e.event_date;const parsed=raw instanceof Date?raw:new Date(String(raw));return Number.isNaN(parsed.getTime())?'Data indisponível':new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(parsed);})();
 const statuses:Record<string,string>={lead:'Oportunidade',quoted:'Orçado',reserved:'Reservado',confirmed:'Confirmado',completed:'Realizado',cancelled:'Cancelado',canceled:'Cancelado'};
 const statusLabel=statuses[String(e.status||'').toLowerCase()]||'Situação não definida';
 const card:React.CSSProperties={background:'#f3f7ff',border:'1px solid #c9d9f5',borderRadius:14,padding:18};
 return <div style={{display:'grid',gap:18,color:'#183c70'}}>
 <div><span style={{fontSize:12,fontWeight:700,color:'#3863a2'}}>CENTRAL DO EVENTO · ANTARES</span><h1 style={{fontSize:28,margin:'8px 0'}}>{String(e.title)}</h1><span>{date} · {String(e.start_time||'').slice(0,5)||'Horário a definir'}{e.end_time?'–'+String(e.end_time).slice(0,5):''} · {statusLabel}</span></div>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12}}>
 <div style={card}><small>Instituição</small><h3>{String(e.client_name)}</h3></div><div style={card}><small>Cúpula</small><h3>{String(e.dome_name||'A definir')}</h3></div><div style={card}><small>Público previsto</small><h3>{e.expected_attendees==null?'A definir':String(e.expected_attendees)}</h3></div></div>
 <section style={card}><h2>Local e deslocamento</h2><p>{address||'Endereço ainda não informado.'}</p>{address&&<div style={{display:'flex',gap:12,flexWrap:'wrap'}}><a href={maps} target="_blank" rel="noopener noreferrer">Abrir Google Maps</a><a href={waze} target="_blank" rel="noopener noreferrer">Abrir Waze</a></div>}</section>
 <section style={card}><h2>Preparação operacional</h2><p>Checklist, sessões e confirmação da equipe serão ativados após a migração segura dos dados operacionais. Nenhuma confirmação fictícia será exibida.</p></section>
 <section style={card}><h2>Equipe</h2><p>Os colaboradores e suas fotos serão vinculados a este evento por registro autorizado, sem duplicar cadastros.</p></section>
 <section style={card}><h2>Observações</h2><p style={{whiteSpace:'pre-wrap'}}>{String(e.notes||'Nenhuma observação registrada.')}</p></section>
 <Link href="/?section=agenda">Consultar Agenda</Link>
 </div>;
}
