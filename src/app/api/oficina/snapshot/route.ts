import {NextResponse} from 'next/server';
import {requireOwner,getDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 const owner=await requireOwner();
 if(!owner)return NextResponse.json({error:'Somente proprietário.'},{status:403,headers});
 try{
  const db=getDb();
  const [clients,contacts,events,proposals,contracts,domes,bookings,ledger]=await Promise.all([
   db`SELECT id,name,kind,city,email,phone,status,notes FROM public.crm_clients WHERE organization_id=${owner.organizationId} ORDER BY created_at DESC LIMIT 500`,
   db`SELECT id,client_id,full_name,position,phone,email,whatsapp,is_primary FROM public.crm_contacts WHERE organization_id=${owner.organizationId} ORDER BY created_at DESC LIMIT 500`,
   db`SELECT id,client_id,title,event_kind,event_date,expected_attendees,pricing_model,price_per_person,fixed_amount,status,venue,notes FROM public.crm_events WHERE organization_id=${owner.organizationId} ORDER BY event_date DESC NULLS LAST LIMIT 500`,
   db`SELECT id,client_id,title,pricing_model,expected_attendees,unit_price,fixed_price,discount,deposit,total,status,valid_until FROM public.business_proposals WHERE organization_id=${owner.organizationId} ORDER BY created_at DESC LIMIT 500`,
   db`SELECT id,proposal_id,confirmation_mode,status,terms FROM public.business_contracts WHERE organization_id=${owner.organizationId} ORDER BY created_at DESC LIMIT 500`,
   db`SELECT id,name,active FROM public.business_domes WHERE organization_id=${owner.organizationId} ORDER BY name`,
   db`SELECT id,event_id,dome_id,starts_at,ends_at,status FROM public.business_bookings WHERE organization_id=${owner.organizationId} ORDER BY starts_at DESC LIMIT 500`,
   db`SELECT id,proposal_id,category,status,description,amount,occurred_on FROM public.business_ledger WHERE organization_id=${owner.organizationId} ORDER BY occurred_on DESC LIMIT 1000`
  ]);
  return NextResponse.json({clients,contacts,events,proposals,contracts,domes,bookings,ledger},{headers});
 }catch{
  return NextResponse.json({error:'Leitura consolidada depende da migração comercial V1. Nenhuma gravação foi executada.'},{status:503,headers});
 }
}
