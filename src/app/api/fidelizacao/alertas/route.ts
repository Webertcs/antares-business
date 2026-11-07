import {NextResponse} from 'next/server';
import {requireOwner,getDb} from '@/lib/equipe/auth';
import {relationshipCycle} from '@/lib/fidelizacao/relationship-cycle';
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
    AND e.client_id=c.id AND e.status='completed'
    AND e.event_date<=${today}::date
   WHERE c.organization_id=${owner.organizationId}
    AND COALESCE(c.status,'active') NOT IN ('archived','inactive')
   GROUP BY c.id,c.name ORDER BY c.name ASC LIMIT 500`;
  let snoozes:Record<string,string>={};
  try{
   const saved=await db`SELECT client_id,snoozed_until FROM public.antares_relationship_snoozes WHERE organization_id=${owner.organizationId} AND snoozed_until>=${today}::date`;
   snoozes=Object.fromEntries(saved.map(r=>[String(r.client_id),r.snoozed_until instanceof Date?r.snoozed_until.toISOString().slice(0,10):String(r.snoozed_until).slice(0,10)]));
  }catch{/* A migração 06D pode estar pendente: alertas originais continuam disponíveis. */}
  const alerts=rows.flatMap(r=>{
   if(!r.last_visit)return [];
   const date=r.last_visit instanceof Date?r.last_visit.toISOString().slice(0,10):String(r.last_visit).slice(0,10);
   const {days}=relationshipCycle([{status:'completed',event_date:date}],today);
   if(days===null||days<60||snoozes[String(r.id)]>=today)return [];
   return [{client_id:String(r.id),client_name:String(r.name),last_visit:date,days,severity:days>=90?'critical':'warning'}];
  });
  return NextResponse.json({alerts,snoozes,count:alerts.length,critical:alerts.filter(a=>a.severity==='critical').length},{headers:{'Cache-Control':'private, no-store'}});
 }catch{
  return NextResponse.json({error:'Alertas temporariamente indisponíveis'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
