import {NextResponse} from 'next/server';
import {requireOwner,getDb,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'private, no-store'};
const validUuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
const validMoney=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)&&n>0&&n<=100000000&&Math.abs(n*100-Math.round(n*100))<0.000001;};
const validDate=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
export async function GET(){
 const owner=await requireOwner();
 if(!owner)return NextResponse.json({error:'Acesso exclusivo do proprietário.'},{status:403,headers:noStore});
 try{
  const db=getDb();
  const [titles,clients,payments]=await Promise.all([
   db`SELECT r.id,r.client_id,c.name AS client_name,r.description,r.total,r.due_on,r.created_at,
      COALESCE((SELECT SUM(l.amount)
        FROM public.antares_receivable_payments p
        JOIN public.ledger_entries l ON l.id=p.ledger_id AND l.organization_id=p.organization_id
        WHERE p.organization_id=r.organization_id AND p.receivable_id=r.id AND l.entry_type='income'
        AND NOT EXISTS(SELECT 1 FROM public.ledger_entries rv
          WHERE rv.organization_id=l.organization_id AND rv.reversal_of=l.id)
      ),0) AS paid
      FROM public.antares_receivables r
      JOIN public.crm_clients c ON c.id=r.client_id AND c.organization_id=r.organization_id
      WHERE r.organization_id=${owner.organizationId} AND r.cancelled_at IS NULL
      ORDER BY r.due_on LIMIT 500`,
   db`SELECT id,name FROM public.crm_clients WHERE organization_id=${owner.organizationId}
      ORDER BY name LIMIT 500`,
   db`SELECT p.id,p.receivable_id,r.client_id,c.name AS client_name,r.description,l.amount,l.occurred_on
      FROM public.antares_receivable_payments p
      JOIN public.antares_receivables r ON r.id=p.receivable_id AND r.organization_id=p.organization_id
      JOIN public.crm_clients c ON c.id=r.client_id AND c.organization_id=r.organization_id
      JOIN public.ledger_entries l ON l.id=p.ledger_id AND l.organization_id=p.organization_id
      WHERE p.organization_id=${owner.organizationId} AND r.cancelled_at IS NULL AND l.entry_type='income'
      AND NOT EXISTS(SELECT 1 FROM public.ledger_entries rv WHERE rv.organization_id=l.organization_id AND rv.reversal_of=l.id)
      ORDER BY l.occurred_on DESC,l.created_at DESC LIMIT 1000`
  ]);
  return NextResponse.json({titles,clients,payments,writesEnabled:process.env.ANTARES_FINANCE_WRITES_ENABLED==='true'&&/^[a-f0-9]{64}$/i.test(process.env.ANTARES_FINANCE_CAPABILITY||'')},{headers:noStore});
 }catch{return NextResponse.json({error:'Contas a receber está temporariamente indisponível.'},{status:503,headers:noStore});}
}
export async function POST(req:Request){
 const owner=await requireOwner();
 if(!owner)return NextResponse.json({error:'Acesso exclusivo do proprietário.'},{status:403});
 if(process.env.ANTARES_FINANCE_WRITES_ENABLED!=='true')
  return NextResponse.json({error:'Não é possível registrar lançamentos financeiros neste momento.'},{status:503});
 const origin=req.headers.get('origin');
 const host=req.headers.get('host');
 let sameOrigin=false;
 try{
  const parsed=origin?new URL(origin):null;
  sameOrigin=Boolean(parsed&&host&&parsed.host===host&&['http:','https:'].includes(parsed.protocol));
 }catch{sameOrigin=false;}
 if(!sameOrigin)
  return NextResponse.json({error:'Origem não autorizada.'},{status:403});
 if(req.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()!=='application/json')
  return NextResponse.json({error:'Conteúdo inválido.'},{status:415});
 const secret=process.env.ANTARES_FINANCE_CAPABILITY;
 if(!secret||!/^[a-f0-9]{64}$/i.test(secret))
  return NextResponse.json({error:'Não foi possível concluir o lançamento financeiro neste momento.'},{status:503});
 let p:Record<string,unknown>;
 try{p=await req.json()}catch{return NextResponse.json({error:'JSON inválido.'},{status:400});}
 try{
  const db=getTeamWriteDb();
  if(p.action==='create'){
   if(!validUuid(p.id)||!validUuid(p.client_id)||
      (p.proposal_id!==null&&p.proposal_id!==undefined&&!validUuid(p.proposal_id))||
      typeof p.description!=='string'||p.description.trim().length<1||p.description.length>300||
      !validMoney(p.total)||!validDate(p.due_on))
    return NextResponse.json({error:'Revise os dados do título.'},{status:400});
   const rows=await db`SELECT public.antares_create_receivable(
    ${secret},${String(owner.user.id)},${owner.organizationId},
    ${p.id},${p.client_id},${p.proposal_id||null},
    ${p.description.trim()},${Number(p.total)},${p.due_on}) AS id`;
   return NextResponse.json({ok:true,id:rows[0]?.id},{headers:noStore});
  }
  if(p.action==='pay'){
   if(!validUuid(p.receivable_id)||!validUuid(p.id)||!validMoney(p.amount)||!validDate(p.paid_on))
    return NextResponse.json({error:'Revise os dados da baixa.'},{status:400});
   const rows=await db`SELECT ledger_id,already_exists FROM public.antares_pay_receivable(
     ${secret},${String(owner.user.id)},${owner.organizationId},
     ${p.receivable_id},${p.id},${Number(p.amount)},${p.paid_on})`;
   return NextResponse.json({ok:true,id:rows[0]?.ledger_id,alreadyExists:rows[0]?.already_exists},{headers:noStore});
  }
  return NextResponse.json({error:'Operação inválida.'},{status:400});
 }catch{return NextResponse.json({error:'Operação não concluída. Confira o extrato e os títulos antes de tentar novamente.'},{status:503});}
}
