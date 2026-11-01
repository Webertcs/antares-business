import {NextResponse} from 'next/server';
import {requireOwner,getDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  const ctx=await requireOwner();
  if(!ctx)return NextResponse.json({error:'Acesso restrito ao proprietário.'},{status:403});
  const db=getDb();
  const [entries,presentations,domes]=await Promise.all([
   db`SELECT l.id,l.entry_type,l.amount,l.description,l.occurred_on,l.created_at,
    l.presentation_id,l.quote_id,l.reversal_of,p.title AS presentation_title,
    d.name AS dome_name
    FROM public.ledger_entries l
    LEFT JOIN public.presentations p ON p.id=l.presentation_id AND p.organization_id=l.organization_id
    LEFT JOIN public.antares_domes d ON d.id=p.dome_id AND d.organization_id=l.organization_id
    WHERE l.organization_id=${ctx.organizationId}
    ORDER BY l.occurred_on DESC,l.created_at DESC LIMIT 1000`,
   db`SELECT id,title,starts_at FROM public.presentations WHERE organization_id=${ctx.organizationId} ORDER BY starts_at DESC LIMIT 300`,
   db`SELECT id,name,active FROM public.antares_domes WHERE organization_id=${ctx.organizationId} ORDER BY name`
  ]);
  const income=entries.filter(x=>x.entry_type==='income').reduce((s,x)=>s+Number(x.amount),0);
  const expenses=entries.filter(x=>x.entry_type==='expense').reduce((s,x)=>s+Number(x.amount),0);
  return NextResponse.json({entries,presentations,domes,income,expenses,balance:income-expenses,limited:entries.length===1000},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Não foi possível consultar o extrato financeiro.'},{status:503});}
}
export async function POST(){return NextResponse.json({error:'Lançamentos ainda bloqueados até aprovação da função SQL de escrita auditável.'},{status:503});}
