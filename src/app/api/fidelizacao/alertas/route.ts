import {NextResponse} from 'next/server';
import {requireOwner,getDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(){
 const owner=await requireOwner();
 if(!owner)return NextResponse.json({error:'Somente proprietário'},{status:403});
 try{
  const db=getDb();
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
  const rows=await db`
   SELECT c.id,c.name,MAX(e.event_date) AS last_visit
   FROM public.crm_clients c
   LEFT JOIN public.crm_events e ON e.organization_id=c.organization_id
    AND e.client_id=c.id AND e.status IN ('confirmed','completed')
    AND e.event_date<=${today}::date
   WHERE c.organization_id=${owner.organizationId}
    AND COALESCE(c.status,'active') NOT IN ('archived','inactive')
   GROUP BY c.id,c.name ORDER BY c.name ASC LIMIT 500`;
  const alerts=rows.flatMap(r=>{
   if(!r.last_visit)return [];
   const date=r.last_visit instanceof Date?r.last_visit.toISOString().slice(0,10):String(r.last_visit).slice(0,10);
   const days=Math.floor((Date.parse(today+'T12:00:00Z')-Date.parse(date+'T12:00:00Z'))/86400000);
   if(!Number.isFinite(days)||days<60)return [];
   return [{client_id:String(r.id),client_name:String(r.name),last_visit:date,days,severity:days>=90?'critical':'warning'}];
  });
  return NextResponse.json({alerts,count:alerts.length,critical:alerts.filter(a=>a.severity==='critical').length},{headers:{'Cache-Control':'private, no-store'}});
 }catch{
  return NextResponse.json({error:'Alertas temporariamente indisponíveis'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
