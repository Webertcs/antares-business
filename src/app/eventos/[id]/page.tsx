import {redirect,notFound} from 'next/navigation';
import {requireMember,getDb} from '@/lib/equipe/auth';
import Link from 'next/link';
import EventOperations from './EventOperations';
import EventTeamPanel from './EventTeamPanel';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const infoCard:React.CSSProperties={background:'linear-gradient(145deg,#fff 0%,#e9f1ff 100%)',border:'1px solid #c4d8ff',borderRadius:16,padding:'14px 16px',boxShadow:'0 6px 20px rgba(25,67,140,.07)',minWidth:0};
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
 const statusConfirmed=String(e.status||'').toLowerCase()==='confirmed';
 return <div style={{display:'grid',gap:14,color:'#173668',paddingBottom:24}}>
 <header style={{position:'relative',overflow:'hidden',borderRadius:20,padding:'clamp(20px,3vw,34px)',color:'#fff',minHeight:174,background:'radial-gradient(ellipse at 86% 82%,rgba(146,54,236,.72),transparent 34%),radial-gradient(ellipse at 68% 10%,rgba(0,159,255,.45),transparent 42%),linear-gradient(115deg,#061c51 0%,#0c348b 56%,#11125b 100%)',boxShadow:'0 12px 28px rgba(12,39,111,.2)'}}>
 <div aria-hidden="true" style={{position:'absolute',right:'-45px',bottom:'-145px',width:330,height:330,borderRadius:'50%',border:'2px solid rgba(109,209,255,.65)',background:'repeating-linear-gradient(0deg,transparent 0 34px,rgba(95,191,255,.18) 35px 36px),repeating-linear-gradient(90deg,transparent 0 42px,rgba(95,191,255,.2) 43px 44px),radial-gradient(circle at 45% 40%,rgba(31,172,255,.5),rgba(110,40,220,.5) 62%,rgba(9,16,67,.7))',boxShadow:'0 0 55px rgba(49,164,255,.38)',transform:'rotate(-12deg)'}}/>
 <div style={{position:'relative',zIndex:1,maxWidth:'75%'}}>
 <div style={{fontSize:12,fontWeight:800,letterSpacing:1.5,color:'#9edcff'}}>CENTRAL DO EVENTO · ANTARES</div>
 <h1 style={{fontSize:'clamp(24px,3vw,36px)',fontWeight:800,margin:'10px 0',lineHeight:1.15,color:'#fff'}}>{String(e.title)}</h1>
 <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',fontWeight:600}}>
 <span>{date} · {String(e.start_time||'').slice(0,5)||'Horário a definir'}{e.end_time?'–'+String(e.end_time).slice(0,5):''}</span>
 <span style={{background:statusConfirmed?'#06734f':'rgba(255,255,255,.17)',border:'1px solid rgba(255,255,255,.35)',padding:'5px 12px',borderRadius:999}}>{statusConfirmed?'✓ ':''}{statusLabel}</span>
 </div></div></header>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10}}>
 {([['Instituição',String(e.client_name),'🏫'],['Cúpula',String(e.dome_name||'A definir'),'🪐'],['Público previsto',e.expected_attendees==null?'A definir':String(e.expected_attendees),'👥']] as const).map(([label,value,icon])=><div key={label} style={infoCard}><div style={{display:'flex',alignItems:'center',gap:10}}><span aria-hidden="true" style={{fontSize:23,background:'#d9eaff',borderRadius:12,padding:8}}>{icon}</span><div style={{minWidth:0}}><small style={{color:'#41659e'}}>{label}</small><div style={{fontWeight:800,overflowWrap:'anywhere'}}>{value}</div></div></div></div>)}
 </div>

 <EventTeamPanel profileKey={ctx.memberId} ownerName="Proprietário"/>
 <EventOperations eventId={id} address={address}/>

 <details style={{...infoCard,padding:0,overflow:'hidden',borderColor:'#d7c3fa'}}><summary style={{cursor:'pointer',padding:'16px 18px',fontWeight:800,background:'linear-gradient(90deg,#eee4ff,#f9f5ff)'}}>📝 Observações <span style={{fontWeight:500,fontSize:12}}> · {e.notes?'Consultar registro':'Nenhuma observação'}</span></summary><p style={{padding:'0 18px 16px',whiteSpace:'pre-wrap'}}>{String(e.notes||'Nenhuma observação registrada.')}</p></details>
 <Link href="/?section=agenda" style={{color:'#1255bf',fontWeight:700}}>Consultar Agenda</Link>
 </div>;
}
