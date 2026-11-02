import { NextResponse } from 'next/server';
import { requireOwner, getDb } from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 try {
  const ctx=await requireOwner();
  if(!ctx)return NextResponse.json({error:'Somente proprietário.'},{status:403});
  const sql=getDb();
  const results=await Promise.allSettled([
   sql`SELECT id,name,kind FROM public.crm_clients WHERE organization_id=${ctx.organizationId} ORDER BY name LIMIT 1000`,
   sql`SELECT p.id,p.client_id,c.name AS client_name,p.title,p.pricing_model,p.expected_attendees,
       p.unit_price,p.fixed_price,p.discount,p.deposit,p.total,p.status,p.valid_until,p.created_at
       FROM public.business_proposals p JOIN public.crm_clients c
       ON c.id=p.client_id AND c.organization_id=p.organization_id
       WHERE p.organization_id=${ctx.organizationId} ORDER BY p.created_at DESC LIMIT 500`,
   sql`SELECT c.id,c.proposal_id,p.title AS proposal_title,c.confirmation_mode,c.status,c.confirmed_at,c.created_at
       FROM public.business_contracts c JOIN public.business_proposals p
       ON p.id=c.proposal_id AND p.organization_id=c.organization_id
       WHERE c.organization_id=${ctx.organizationId} ORDER BY c.created_at DESC LIMIT 500`,
   sql`SELECT id,name,active FROM public.antares_domes WHERE organization_id=${ctx.organizationId} ORDER BY name`,
   sql`SELECT p.id,p.id AS event_id,p.dome_id,COALESCE(d.name,'Sem cúpula') AS dome_name,
       p.title AS event_title,p.starts_at,p.ends_at,p.status
       FROM public.presentations p LEFT JOIN public.antares_domes d
       ON d.id=p.dome_id AND d.organization_id=p.organization_id
       WHERE p.organization_id=${ctx.organizationId} ORDER BY p.starts_at DESC LIMIT 500`,
   sql`SELECT id,entry_type AS category,'settled'::text AS status,description,amount,occurred_on,quote_id AS proposal_id
       FROM public.ledger_entries WHERE organization_id=${ctx.organizationId}
       ORDER BY occurred_on DESC,created_at DESC LIMIT 1000`,
   sql`SELECT id,action,entity_type,entity_id,created_at FROM public.business_audit
       WHERE organization_id=${ctx.organizationId} ORDER BY created_at DESC LIMIT 100`
  ]);
  const keys=['clients','proposals','contracts','domes','bookings','ledger','audit'] as const;
  const data=Object.fromEntries(results.map((result,i)=>[keys[i],result.status==='fulfilled'?result.value:[]]));
  const unavailable=keys.filter((_,i)=>results[i].status==='rejected');
  return NextResponse.json({...data,unavailable},
     {headers:{'Cache-Control':'private, no-store'}});
 }catch{
  return NextResponse.json({error:'Núcleo V1 ainda não implantado. Aguardando migração e auditoria.'},
   {status:503,headers:{'Cache-Control':'no-store'}});
 }
}
export async function POST(){
 return NextResponse.json({error:'Escrita da V1 bloqueada até migração e autorização multempresa.'},{status:503});
}
