import {NextResponse} from 'next/server';
import {requireOwner,getDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const head={'Cache-Control':'private, no-store'};
export async function GET(){
 const owner=await requireOwner();
 if(!owner)return NextResponse.json({error:'Somente proprietário.'},{status:403,headers:head});
 try{
  const db=getDb();
  const [monthly,proposals,clients]=await Promise.all([
   db`SELECT date_trunc('month',occurred_on::timestamp)::date AS mes,
     coalesce(sum(amount) FILTER (WHERE category='income' AND status='settled'),0) AS recebido,
     coalesce(sum(amount) FILTER (WHERE category='expense' AND status='settled'),0) AS despesas,
     coalesce(sum(amount) FILTER (WHERE category='income' AND status='planned'),0) AS a_receber,
     coalesce(sum(amount) FILTER (WHERE category='expense' AND status='planned'),0) AS a_pagar
     FROM public.business_ledger WHERE organization_id=${owner.organizationId}
     GROUP BY 1 ORDER BY 1 DESC LIMIT 36`,
   db`SELECT status,count(*)::integer quantidade,
     coalesce(sum(total),0) valor FROM public.business_proposals
     WHERE organization_id=${owner.organizationId} GROUP BY status ORDER BY status`,
   db`SELECT kind,count(*)::integer quantidade FROM public.crm_clients
     WHERE organization_id=${owner.organizationId} GROUP BY kind ORDER BY kind`
  ]);
  return NextResponse.json({monthly,proposals,clients},
   {headers:head});
 }catch{return NextResponse.json({error:'Balanço indisponível até implantação da V1.'},
  {status:503,headers:head});}
}
