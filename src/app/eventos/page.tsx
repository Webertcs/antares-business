import {redirect} from 'next/navigation';
import RelationshipShell from '../RelationshipShell';
import {requireMember,getDb} from '@/lib/equipe/auth';
import EventsList from './EventsList';
export const dynamic='force-dynamic';
export default async function Page(){
 const ctx=await requireMember();if(!ctx)redirect('/sem-acesso');
 const db=getDb();
 const rows=await db`SELECT e.id,e.title,e.event_date,e.status,e.expected_attendees,c.name AS client_name
 FROM public.crm_events e
 JOIN public.crm_clients c ON c.id=e.client_id AND c.organization_id=e.organization_id
 WHERE e.organization_id=${ctx.organizationId}
 ORDER BY e.event_date DESC NULLS LAST,e.created_at DESC LIMIT 300`;
 const events=rows.map(r=>({id:String(r.id),title:String(r.title),date:r.event_date?String(r.event_date).slice(0,10):null,status:String(r.status||''),attendees:r.expected_attendees==null?null:Number(r.expected_attendees),client:String(r.client_name)}));
 return <RelationshipShell title="Eventos"><main style={{maxWidth:1100,margin:'0 auto',padding:'24px clamp(14px,2.5vw,26px)',color:'#163968'}}>
 <header style={{marginBottom:16,padding:'20px clamp(16px,2.5vw,24px)',borderRadius:14,background:'linear-gradient(110deg,#0d2455 0%,#0c3c91 60%,#0860ba 100%)',boxShadow:'0 5px 14px rgba(11,47,111,.14)'}}>
  <p style={{fontSize:11,fontWeight:700,letterSpacing:'1.3px',color:'#b9dfff',margin:'0 0 8px'}}>GESTÃO DE EVENTOS · ANTARES</p>
  <h1 style={{fontSize:'clamp(23px,2.5vw,30px)',fontWeight:750,lineHeight:1.2,margin:'0 0 6px',color:'#fff'}}>Eventos</h1>
  <p style={{fontSize:14,lineHeight:1.5,margin:0,color:'#e1efff'}}>Consulte os eventos cadastrados e abra a preparação operacional.</p>
 </header>
 <EventsList events={events}/>
 </main></RelationshipShell>;
}