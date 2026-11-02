import {NextResponse} from 'next/server';
import {requireOwner,getDb} from '@/lib/equipe/auth';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){
 const owner=await requireOwner();
 if(!owner)return NextResponse.json({error:'Somente proprietário'},{status:403});
 try{
 const db=getDb();
 const [clients,proposals,presentations,receivables,groups]=await Promise.all([
 db`SELECT count(*)::int total FROM public.crm_clients WHERE organization_id=${owner.organizationId}`,
 db`SELECT count(*)::int total,count(*) FILTER(WHERE status='accepted')::int accepted,
 coalesce(sum(total) FILTER(WHERE status='accepted'),0) accepted_value
 FROM public.business_proposals WHERE organization_id=${owner.organizationId}`,
 db`SELECT count(*) FILTER(WHERE starts_at>=now() AND status NOT IN('cancelled','canceled','completed'))::int upcoming,
 count(*) FILTER(WHERE status='completed')::int completed
 FROM public.presentations WHERE organization_id=${owner.organizationId}`,
 db`SELECT count(*) FILTER(WHERE r.cancelled_at IS NULL AND r.due_on<CURRENT_DATE
 AND r.total>COALESCE((SELECT sum(l.amount) FROM public.antares_receivable_payments pay JOIN public.ledger_entries l
 ON l.id=pay.ledger_id AND l.organization_id=pay.organization_id
 WHERE pay.receivable_id=r.id AND pay.organization_id=r.organization_id),0))::int overdue,
 coalesce(sum(r.total) FILTER(WHERE r.cancelled_at IS NULL),0) total
 FROM public.antares_receivables r WHERE r.organization_id=${owner.organizationId}`,
 db`SELECT count(*)::int groups,coalesce(sum(student_count),0)::int students
 FROM public.antares_education_groups WHERE organization_id=${owner.organizationId}`
 ]);
 return NextResponse.json({clients:clients[0],proposals:proposals[0],presentations:presentations[0],
 receivables:receivables[0],education:groups[0],generatedAt:new Date().toISOString()},
 {headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Indicadores indisponíveis. Confira migrações e permissões.'},{status:503});}
}
