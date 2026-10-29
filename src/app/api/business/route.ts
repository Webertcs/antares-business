import { NextResponse } from 'next/server';
import { requireOwner, getDb } from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 try {
  const ctx=await requireOwner();
  if(!ctx)return NextResponse.json({error:'Somente proprietário.'},{status:403});
  const sql=getDb();
  const [clients,proposals,contracts,domes,bookings,ledger,audit]=await Promise.all([
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
   sql`SELECT id,name,active FROM public.business_domes WHERE organization_id=${ctx.organizationId} ORDER BY name`,
   sql`SELECT b.id,b.event_id,b.dome_id,d.name AS dome_name,e.title AS event_title,
       b.starts_at,b.ends_at,b.status FROM public.business_bookings b
       JOIN public.business_domes d ON d.id=b.dome_id AND d.organization_id=b.organization_id
       JOIN public.crm_events e ON e.id=b.event_id AND e.organization_id=b.organization_id
       WHERE b.organization_id=${ctx.organizationId} ORDER BY b.starts_at DESC LIMIT 500`,
   sql`SELECT id,category,status,description,amount,occurred_on,proposal_id FROM public.business_ledger
       WHERE organization_id=${ctx.organizationId} ORDER BY occurred_on DESC,created_at DESC LIMIT 1000`,
   sql`SELECT id,action,entity_type,entity_id,created_at FROM public.business_audit
       WHERE organization_id=${ctx.organizationId} ORDER BY created_at DESC LIMIT 100`
  ]);
  return NextResponse.json({clients,proposals,contracts,domes,bookings,ledger,audit},
     {headers:{'Cache-Control':'private, no-store'}});
 }catch{
  return NextResponse.json({error:'Núcleo V1 ainda não implantado. Aguardando migração e auditoria.'},
   {status:503,headers:{'Cache-Control':'no-store'}});
 }
}
export async function POST(){
 return NextResponse.json({error:'Escrita da V1 bloqueada até migração e autorização multempresa.'},{status:503});
}
