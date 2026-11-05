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
  const [monthly,annual,proposals,clients]=await Promise.all([
   db`SELECT date_trunc('month',occurred_on::timestamp)::date AS mes,
     coalesce(sum(amount) FILTER (WHERE entry_type='income'),0) AS recebido,
     coalesce(sum(amount) FILTER (WHERE entry_type='expense'),0) AS despesas,
     0::numeric AS a_receber,
     0::numeric AS a_pagar
     FROM public.ledger_entries WHERE organization_id=${owner.organizationId}
     GROUP BY 1 ORDER BY 1 DESC LIMIT 36`,
   db`SELECT extract(year FROM occurred_on)::integer ano,
     coalesce(sum(amount) FILTER (WHERE entry_type='income'),0) recebido,
     coalesce(sum(amount) FILTER (WHERE entry_type='expense'),0) despesas,
     0::numeric a_receber,
     0::numeric a_pagar
     FROM public.ledger_entries WHERE organization_id=${owner.organizationId}
     GROUP BY 1 ORDER BY 1 DESC LIMIT 10`,
   db`SELECT status,count(*)::integer quantidade,
     coalesce(sum(total),0) valor FROM public.business_proposals
     WHERE organization_id=${owner.organizationId} GROUP BY status ORDER BY status`,
   db`SELECT kind,count(*)::integer quantidade FROM public.crm_clients
     WHERE organization_id=${owner.organizationId} GROUP BY kind ORDER BY kind`
  ]);
  return NextResponse.json({monthly,annual,proposals,clients,notice:'Valores previstos não são calculados a partir do livro-caixa realizado.'},
   {headers:head});
 }catch{return NextResponse.json({error:'Balanço indisponível até implantação da V1.'},
  {status:503,headers:head});}
}
