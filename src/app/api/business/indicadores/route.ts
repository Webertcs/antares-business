import {NextResponse} from 'next/server';
import {requireOwner,getDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 const ctx=await requireOwner();
 if(!ctx)return NextResponse.json({error:'Somente proprietário.'},{status:403,headers});
 try{
  const sql=getDb();
  const [proposals,bookings,finance]=await Promise.all([
   sql`SELECT count(*)::int AS total,
    count(*) FILTER (WHERE status='draft')::int AS rascunhos,
    count(*) FILTER (WHERE status='sent')::int AS enviadas,
    count(*) FILTER (WHERE status='negotiating')::int AS negociacao,
    count(*) FILTER (WHERE status='accepted')::int AS aceitas,
    coalesce(sum(total) FILTER (WHERE status='accepted'),0) AS valor_aceito
    FROM public.business_proposals WHERE organization_id=${ctx.organizationId}`,
   sql`SELECT count(*)::int AS total,
    count(*) FILTER (WHERE starts_at>=now() AND status IN ('reserved','confirmed'))::int AS futuras,
    count(*) FILTER (WHERE status='completed')::int AS realizadas
    FROM public.business_bookings WHERE organization_id=${ctx.organizationId}`,
   sql`SELECT
    coalesce(sum(amount) FILTER (WHERE category='income' AND status='settled'),0) AS receitas,
    coalesce(sum(amount) FILTER (WHERE category='expense' AND status='settled'),0) AS despesas,
    coalesce(sum(amount) FILTER (WHERE category='income' AND status='planned'),0) AS previsto
    FROM public.business_ledger WHERE organization_id=${ctx.organizationId}`
  ]);
  return NextResponse.json({proposals:proposals[0],bookings:bookings[0],finance:finance[0]}, {headers});
 }catch{return NextResponse.json({error:'Indicadores V1 indisponíveis antes da implantação.'},{status:503,headers});}
}
