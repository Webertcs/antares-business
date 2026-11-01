import {NextResponse} from 'next/server';
import {requireOwner,getDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 const owner=await requireOwner();
 if(!owner)return NextResponse.json({error:'Acesso exclusivo do proprietário.'},{status:403,headers});
 try {
  const sql=getDb();
  const [months,years,domes,receivables]=await Promise.all([
   sql`SELECT to_char(date_trunc('month',occurred_on),'YYYY-MM') AS periodo,
      coalesce(sum(amount) FILTER(WHERE entry_type='income'),0) AS receitas,
      coalesce(sum(amount) FILTER(WHERE entry_type='expense'),0) AS despesas
    FROM public.ledger_entries WHERE organization_id=${owner.organizationId}
    GROUP BY 1 ORDER BY 1 DESC LIMIT 36`,
   sql`SELECT extract(year from occurred_on)::int AS ano,
      coalesce(sum(amount) FILTER(WHERE entry_type='income'),0) AS receitas,
      coalesce(sum(amount) FILTER(WHERE entry_type='expense'),0) AS despesas
    FROM public.ledger_entries WHERE organization_id=${owner.organizationId}
    GROUP BY 1 ORDER BY 1 DESC LIMIT 10`,
   sql`SELECT coalesce(d.name,'Sem cúpula vinculada') AS cupula,
      coalesce(sum(l.amount) FILTER(WHERE l.entry_type='income'),0) AS receitas,
      coalesce(sum(l.amount) FILTER(WHERE l.entry_type='expense'),0) AS despesas
    FROM public.ledger_entries l
    LEFT JOIN public.presentations p ON p.id=l.presentation_id AND p.organization_id=l.organization_id
    LEFT JOIN public.antares_domes d ON d.id=p.dome_id AND d.organization_id=l.organization_id
    WHERE l.organization_id=${owner.organizationId}
    GROUP BY 1 ORDER BY 1`,
   sql`SELECT id,title,total,status,valid_until,client_id
    FROM public.business_proposals
    WHERE organization_id=${owner.organizationId} AND status IN ('accepted','sent','negotiating')
    ORDER BY created_at DESC LIMIT 200`
  ]);
  return NextResponse.json({months,years,domes,proposals:receivables,
    notes:['Fluxo de caixa por data de realização; propostas não são receitas recebidas.',
     'Propostas aceitas são oportunidades comerciais, não contas a receber contábeis comprovadas.',
     'Resumo gerencial de caixa: não equivale a balanço patrimonial ou balancete contábil.']},{headers});
 }catch{return NextResponse.json({error:'Relatórios financeiros temporariamente indisponíveis.'},{status:503,headers});}
}
