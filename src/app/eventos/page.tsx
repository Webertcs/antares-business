import {redirect} from 'next/navigation';
import Link from 'next/link';
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
 return <main style={{maxWidth:1100,margin:'0 auto',padding:'32px 22px',color:'#163968'}}>
 <Link href="/" style={{display:'inline-block',marginBottom:16,color:'#1d59bb'}}>← Voltar ao painel</Link>
 <h1 style={{fontSize:30,fontWeight:800,marginBottom:6}}>Eventos</h1>
 <p style={{marginBottom:22,color:'#52719b'}}>Acompanhe os eventos cadastrados e abra a preparação operacional.</p>
 <EventsList events={events}/>
 </main>;
}