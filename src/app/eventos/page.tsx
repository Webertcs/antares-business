import {redirect} from 'next/navigation';
import RelationshipShell from '../RelationshipShell';
import {requireMember,getDb} from '@/lib/equipe/auth';
import EventsList from './EventsList';
export const dynamic='force-dynamic';
type Params={page?:string;year?:string;status?:string;q?:string;view?:string};
export default async function Page({searchParams}:{searchParams:Promise<Params>}){
 const ctx=await requireMember();if(!ctx)redirect('/sem-acesso');
 const params=await searchParams;
 const page=Math.max(1,Math.min(100000,Number.parseInt(params.page||'1',10)||1));
 const year=/^\d{4}$/.test(params.year||'')?params.year!:'all';
 const status=['lead','quoted','reserved','confirmed','completed','cancelled'].includes(params.status||'')?params.status!:'all';
 const view=['upcoming','history','all'].includes(params.view||'')?params.view!:'all';
 const q=(params.q||'').trim().slice(0,120);
 const db=getDb();
 const counts=await db`SELECT COUNT(*)::int AS total,
 COUNT(*) FILTER (WHERE e.status='confirmed')::int AS confirmed,
 COUNT(*) FILTER (WHERE e.status='lead')::int AS opportunities
 FROM public.crm_events e JOIN public.crm_clients c ON c.id=e.client_id AND c.organization_id=e.organization_id
 WHERE e.organization_id=${ctx.organizationId} AND e.archived_at IS NULL`;
 const yearsRows=await db`SELECT DISTINCT EXTRACT(YEAR FROM event_date)::int AS year FROM public.crm_events WHERE organization_id=${ctx.organizationId} AND event_date IS NOT NULL ORDER BY year DESC`;
 const totalRows=await db`SELECT COUNT(*)::int AS total FROM public.crm_events e JOIN public.crm_clients c ON c.id=e.client_id AND c.organization_id=e.organization_id WHERE e.organization_id=${ctx.organizationId} AND (${view}='history' OR e.archived_at IS NULL)
 AND (${year}='all' OR EXTRACT(YEAR FROM e.event_date)::text=${year})
 AND (${status}='all' OR e.status=${status} OR (${status}='cancelled' AND e.status='canceled'))
 AND (${q}='' OR e.title ILIKE ${'%'+q+'%'} OR c.name ILIKE ${'%'+q+'%'})
 AND (${view}='all' OR (${view}='upcoming' AND (e.event_date>=CURRENT_DATE OR e.event_date IS NULL) AND e.status NOT IN ('completed','cancelled','canceled')) OR (${view}='history' AND (e.archived_at IS NOT NULL OR e.event_date<CURRENT_DATE OR e.status IN ('completed','cancelled','canceled'))))`;
 const total=Number(totalRows[0]?.total||0);
 const pages=Math.max(1,Math.ceil(total/20));
 const current=Math.min(page,pages);
 const rows=await db`SELECT e.id,e.title,e.event_date,e.status,e.expected_attendees,e.archived_at,c.name AS client_name
 FROM public.crm_events e JOIN public.crm_clients c ON c.id=e.client_id AND c.organization_id=e.organization_id
 WHERE e.organization_id=${ctx.organizationId}
 AND (${year}='all' OR EXTRACT(YEAR FROM e.event_date)::text=${year})
 AND (${status}='all' OR e.status=${status} OR (${status}='cancelled' AND e.status='canceled'))
 AND (${q}='' OR e.title ILIKE ${'%'+q+'%'} OR c.name ILIKE ${'%'+q+'%'})
 AND (${view}='all' OR (${view}='upcoming' AND (e.event_date>=CURRENT_DATE OR e.event_date IS NULL) AND e.status NOT IN ('completed','cancelled','canceled')) OR (${view}='history' AND (e.archived_at IS NOT NULL OR e.event_date<CURRENT_DATE OR e.status IN ('completed','cancelled','canceled'))))
 ORDER BY CASE WHEN ${view}='upcoming' THEN e.event_date END ASC NULLS LAST,
 CASE WHEN ${view}<>'upcoming' THEN e.event_date END DESC NULLS LAST,e.created_at DESC
 LIMIT 20 OFFSET ${(current-1)*20}`;
 const events=rows.map(r=>({id:String(r.id),title:String(r.title),date:r.event_date?(r.event_date instanceof Date?r.event_date.toISOString().slice(0,10):/^\d{4}-\d{2}-\d{2}/.test(String(r.event_date))?String(r.event_date).slice(0,10):new Date(String(r.event_date)).toISOString().slice(0,10)):null,status:String(r.status||''),attendees:r.expected_attendees==null?null:Number(r.expected_attendees),client:String(r.client_name),archived:!!r.archived_at}));
 return <RelationshipShell title="Eventos"><main style={{maxWidth:1100,margin:'0 auto',padding:'24px clamp(14px,2.5vw,26px)',color:'#163968'}}>
 <header style={{marginBottom:16,padding:'20px clamp(16px,2.5vw,24px)',borderRadius:14,background:'linear-gradient(110deg,#0d2455 0%,#0c3c91 60%,#0860ba 100%)',boxShadow:'0 5px 14px rgba(11,47,111,.14)'}}>
  <p style={{fontSize:11,fontWeight:700,letterSpacing:'1.3px',color:'#b9dfff',margin:'0 0 8px'}}>GESTÃO DE EVENTOS · ANTARES</p>
  <h1 style={{fontSize:'clamp(23px,2.5vw,30px)',fontWeight:750,lineHeight:1.2,margin:'0 0 6px',color:'#fff'}}>Eventos</h1>
  <p style={{fontSize:14,lineHeight:1.5,margin:0,color:'#e1efff'}}>Consulte os eventos cadastrados e abra a preparação operacional.</p>
 </header>
 <EventsList events={events} total={total} page={current} pages={pages} years={yearsRows.map(r=>Number(r.year))} counts={{total:Number(counts[0]?.total||0),confirmed:Number(counts[0]?.confirmed||0),opportunities:Number(counts[0]?.opportunities||0)}} filters={{year,status,view,q}}/>
 </main></RelationshipShell>;
}