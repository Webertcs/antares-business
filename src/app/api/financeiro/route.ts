import {NextResponse} from 'next/server';
import {requireOwner,getDb,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  const ctx=await requireOwner();
  if(!ctx)return NextResponse.json({error:'Acesso restrito ao proprietário.'},{status:403});
  const db=getDb();
  const [entries,presentations,domes,totals]=await Promise.all([
   db`SELECT l.id,l.entry_type,l.amount,l.description,l.occurred_on,l.created_at,
    l.presentation_id,l.quote_id,l.reversal_of,p.title AS presentation_title,
    d.name AS dome_name
    FROM public.ledger_entries l
    LEFT JOIN public.presentations p ON p.id=l.presentation_id AND p.organization_id=l.organization_id
    LEFT JOIN public.antares_domes d ON d.id=p.dome_id AND d.organization_id=l.organization_id
    WHERE l.organization_id=${ctx.organizationId}
    ORDER BY l.occurred_on DESC,l.created_at DESC LIMIT 1000`,
   db`SELECT id,title,starts_at FROM public.presentations WHERE organization_id=${ctx.organizationId} ORDER BY starts_at DESC LIMIT 300`,
   db`SELECT id,name,active FROM public.antares_domes WHERE organization_id=${ctx.organizationId} ORDER BY name`,
   db`SELECT COALESCE(SUM(amount) FILTER (WHERE entry_type='income'),0) AS income, COALESCE(SUM(amount) FILTER (WHERE entry_type='expense'),0) AS expenses FROM public.ledger_entries WHERE organization_id=${ctx.organizationId}`
  ]);
  const income=Number(totals[0]?.income||0);
  const expenses=Number(totals[0]?.expenses||0);
  return NextResponse.json({entries,presentations,domes,income,expenses,balance:income-expenses,limited:entries.length===1000},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Não foi possível consultar o extrato financeiro.'},{status:503});}
}
export async function POST(request:Request){
 try{
  const ctx=await requireOwner();
  if(!ctx)return NextResponse.json({error:'Acesso restrito ao proprietário.'},{status:403});
  const origin=request.headers.get('origin');
  const host=request.headers.get('host');
  if(!origin||!host||new URL(origin).host!==host)return NextResponse.json({error:'Origem não autorizada.'},{status:403});
  const body=await request.json();
  const id=typeof body.id==='string'?body.id:'';
  const entryType=body.entry_type;
  const description=typeof body.description==='string'?body.description.trim():'';
  const amount=Number(body.amount);
  const occurredOn=body.occurred_on;
  const presentationId=body.presentation_id||null;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    || !['income','expense'].includes(entryType)||!description||description.length>500
    ||!Number.isFinite(amount)||amount<=0||amount>100000000
    ||Math.abs(amount*100-Math.round(amount*100))>0.000001
    ||typeof occurredOn!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(occurredOn)
    ||Number.isNaN(Date.parse(occurredOn+'T12:00:00Z'))
    ||new Date(occurredOn+'T12:00:00Z').toISOString().slice(0,10)!==occurredOn
    ||(presentationId!==null&&!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(presentationId)))
    return NextResponse.json({error:'Revise os dados do lançamento.'},{status:400});
  if(process.env.ANTARES_FINANCE_WRITES_ENABLED!=='true')return NextResponse.json({error:'Gravação financeira bloqueada até validação das permissões.'},{status:503});
  const capability=process.env.ANTARES_FINANCE_CAPABILITY;
  if(!capability||!/^[0-9a-f]{64}$/i.test(capability))return NextResponse.json({error:'Capacidade financeira ainda não configurada.'},{status:503});
  const db=getTeamWriteDb();
  const rows=await db`SELECT entry_id,already_exists FROM public.antares_post_ledger_entry(
   ${capability},${String(ctx.user.id)},${ctx.organizationId},${id},${entryType},${amount},
   ${description},${occurredOn},${presentationId}
  )`;
  return NextResponse.json({ok:true,id,alreadyExists:Boolean(rows[0]?.already_exists)});
 }catch{return NextResponse.json({error:'Não foi possível registrar o lançamento. Confira o extrato antes de tentar novamente.'},{status:503});}
}
