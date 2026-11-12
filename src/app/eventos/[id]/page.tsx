import {redirect,notFound} from 'next/navigation';
import {requireMember,getDb} from '@/lib/equipe/auth';
import EventOperations from './EventOperations';
import EventTeamPanel from './EventTeamPanel';
import EventNotes from './EventNotes';
import EventClosing from './EventClosing';
import EventDomePicker from './EventDomePicker';
import EventLifecycleActions from '../EventLifecycleActions';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const infoCard:React.CSSProperties={background:'linear-gradient(145deg,#fff 0%,#e9f1ff 100%)',border:'1px solid #c4d8ff',borderRadius:12,padding:'10px 12px',boxShadow:'0 6px 20px rgba(25,67,140,.07)',minWidth:0};
export default async function Page({params}:{params:Promise<{id:string}>}){
 const ctx=await requireMember();if(!ctx)redirect('/sem-acesso');
 const {id}=await params;if(!uuid.test(id))notFound();
 const db=getDb();
 const rows=await db`SELECT e.id,e.title,e.event_date,e.start_time,e.end_time,e.status,e.venue,e.notes,e.expected_attendees,e.dome_id,e.archived_at,
 c.name AS client_name,c.city,c.phone AS client_phone,d.name AS dome_name
 FROM public.crm_events e JOIN public.crm_clients c ON c.id=e.client_id AND c.organization_id=e.organization_id
 LEFT JOIN public.antares_domes d ON d.id=e.dome_id AND d.organization_id=e.organization_id
 WHERE e.id=${id} AND e.organization_id=${ctx.organizationId} LIMIT 1`;
 if(!rows.length)notFound();const e=rows[0];
 const linkedRows=await db`SELECT 1 FROM public.antares_presentation_event_links WHERE organization_id=${ctx.organizationId} AND event_id=${id} LIMIT 1`;
 const hasLinkedReservation=linkedRows.length>0;
 const domeRows=ctx.role==='owner'&&!hasLinkedReservation?await db`SELECT id,name,capacity FROM public.antares_domes WHERE organization_id=${ctx.organizationId} AND active=true ORDER BY name`:[];
 const assigned=await db`SELECT t.id,COALESCE(NULLIF(p.display_name,''),t.full_name) AS full_name,p.photo_data FROM public.antares_event_team_assignments a JOIN public.team_members t ON t.id=a.member_id AND t.organization_id=a.organization_id AND t.active=true AND t.role='collaborator' LEFT JOIN public.antares_member_profiles p ON p.organization_id=t.organization_id AND p.member_id=t.id WHERE a.organization_id=${ctx.organizationId}::uuid AND a.event_id=${id}::uuid ORDER BY t.full_name,t.id`;
 const owners=await db`SELECT t.id,COALESCE(NULLIF(p.display_name,''),t.full_name) AS full_name,p.photo_data
 FROM public.team_members t LEFT JOIN public.antares_member_profiles p ON p.organization_id=t.organization_id AND p.member_id=t.id
 WHERE t.organization_id=${ctx.organizationId}::uuid AND t.role='owner' AND t.active=true ORDER BY t.id LIMIT 1`;
 const eventOwner=owners[0];
 const address=String(e.venue||'').trim();
 const maps='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(address);
 const waze='https://waze.com/ul?q='+encodeURIComponent(address)+'&navigate=yes';
 const date=(()=>{if(!e.event_date)return 'A definir';const raw=e.event_date;const parsed=raw instanceof Date?raw:new Date(String(raw));return Number.isNaN(parsed.getTime())?'Data indisponível':new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(parsed);})();
 return <div className="antares-event-center" style={{display:'grid',gap:9,color:'#173668',paddingBottom:12}}>
 <header className="antares-event-center-hero" style={{position:'relative',overflow:'hidden',borderRadius:14,padding:'clamp(12px,1.6vw,20px)',color:'#fff',minHeight:100,background:'radial-gradient(ellipse at 80% 12%,rgba(0,159,255,.32),transparent 42%),linear-gradient(115deg,#061c51 0%,#0c348b 65%,#0a4ea1 100%)',boxShadow:'0 12px 28px rgba(12,39,111,.2)'}}>
 <div style={{position:'relative',zIndex:1,maxWidth:'75%'}}>
 <div style={{fontSize:12,fontWeight:800,letterSpacing:1.5,color:'#9edcff'}}>CENTRAL DO EVENTO · ANTARES</div>
 <h1 style={{fontSize:'clamp(22px,2.4vw,29px)',fontWeight:800,margin:'5px 0',lineHeight:1.15,color:'#fff'}}>{String(e.title)}</h1>
 <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',fontWeight:600}}>
 <span>{date} · {String(e.start_time||'').slice(0,5)||'Horário a definir'}{e.end_time?'–'+String(e.end_time).slice(0,5):''}</span>
 <EventLifecycleActions eventId={id} status={String(e.status)} archived={!!e.archived_at}/></div></div></header>
 <div className="antares-event-center-metrics" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10}}>
 {([['Instituição',String(e.client_name),'🏫'],['Cúpula',String(e.dome_name||'A definir'),'🪐'],['Público previsto',e.expected_attendees==null?'A definir':String(e.expected_attendees),'👥']] as const).map(([label,value,icon])=><div key={label} className="antares-event-center-metric" style={infoCard}><div style={{display:'flex',alignItems:'center',gap:10}}><span aria-hidden="true" style={{fontSize:23,background:'#d9eaff',borderRadius:12,padding:8}}>{icon}</span><div style={{minWidth:0}}><div style={{fontSize:14,fontWeight:750,color:'#28589b',lineHeight:1.3}}>{label}</div><div style={{fontSize:15,fontWeight:400,overflowWrap:'anywhere',lineHeight:1.35}}>{value}</div></div></div></div>)}
 </div>
 {ctx.role==='owner'&&!hasLinkedReservation&&<EventDomePicker eventId={id} initialDomeId={String(e.dome_id||'')} domes={domeRows.map(d=>({id:String(d.id),name:String(d.name),capacity:d.capacity==null?null:Number(d.capacity)}))}/>}

 <EventTeamPanel eventId={id} ownerName={String(eventOwner?.full_name||'Proprietário')} ownerPhoto={typeof eventOwner?.photo_data==='string'?eventOwner.photo_data:null} isOwner={ctx.role==='owner'} initialAssigned={assigned.map(m=>({id:String(m.id),full_name:String(m.full_name),photo_data:typeof m.photo_data==='string'?m.photo_data:null}))}/>
 <EventOperations eventId={id}/>
 <EventClosing eventId={id}/>

 <EventNotes eventId={id} initialNotes={String(e.notes||'')} canEdit={ctx.role==='owner' && process.env.ANTARES_EVENT_OPERATIONS_WRITES_ENABLED==='true'}/>
 </div>;
}
