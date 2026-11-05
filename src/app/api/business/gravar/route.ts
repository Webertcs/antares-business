import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const deny=(error:string,status=403)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:NextRequest){
 if(process.env.ANTARES_V1_WRITES_ENABLED!=='true' ||
    process.env.ANTARES_V1_SECURITY_APPROVED!=='true')
  return deny('V1 comercial em implantação: gravação desabilitada.',503);
 let origin:string;
 try{origin=new URL(process.env.ANTARES_APP_ORIGIN||'').origin;}
 catch{return deny('Origem não configurada.',503);}
 if(request.headers.get('origin')!==origin)return deny('Origem não autorizada.');
 if(request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()!=='application/json')
  return deny('Apenas application/json.',415);
 if(Number(request.headers.get('content-length')||'0')>12000)return deny('Requisição muito grande.',413);
 const owner=await requireOwner();
 if(!owner)return deny('Somente proprietário.');
 try{
  const db=getTeamWriteDb();
  const checks=await db`SELECT current_user='antares_team_runtime'
    AND NOT rolsuper AND NOT rolbypassrls AS safe_role,
    (SELECT count(*)=5 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
      AND p.proname IN ('business_create_proposal','business_create_contract',
      'business_create_dome','business_create_booking','business_create_ledger_entry')
      AND p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
      AND has_function_privilege(current_user,p.oid,'EXECUTE')
      AND NOT EXISTS (SELECT 1 FROM aclexplode(
        coalesce(p.proacl,acldefault('f',p.proowner))) acl
        WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE')) AS safe_functions,
    (SELECT count(*)=6 FROM pg_class c WHERE c.oid IN (
      'public.business_proposals'::regclass,'public.business_contracts'::regclass,
      'public.business_domes'::regclass,'public.business_bookings'::regclass,
      'public.business_ledger'::regclass,'public.business_audit'::regclass)
      AND c.relrowsecurity
      AND NOT has_table_privilege(current_user,c.oid,'SELECT')
      AND NOT has_table_privilege(current_user,c.oid,'INSERT')
      AND NOT has_table_privilege(current_user,c.oid,'UPDATE')
      AND NOT has_table_privilege(current_user,c.oid,'DELETE')) AS safe_tables
    FROM pg_roles WHERE rolname=current_user`;
  if(!checks[0]?.safe_role||!checks[0]?.safe_functions||!checks[0]?.safe_tables)
    return deny('Permissões V1 não verificadas.',503);
  const body=await request.json();
  const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v)?v:null;
  const str=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
  const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
  if(body.action==='proposal'){
   if(!uuid(body.clientId))return deny('Cliente inválido.',400);
   if(body.eventId&&!uuid(body.eventId))return deny('Evento inválido.',400);
   const date=str(body.validUntil,10);
   if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))return deny('Validade inválida.',400);
   const vals=[body.attendees,body.unitPrice,body.fixedPrice,body.discount,body.deposit];
   if(vals.some(v=>v!=null&&num(v)===null))return deny('Valores inválidos.',400);
   const result=await db`SELECT public.business_create_proposal(
    ${owner.user.id},${uuid(body.clientId)}::uuid,${uuid(body.eventId)}::uuid,
    ${str(body.title,180)},${str(body.model,30)},${num(body.attendees)},
    ${num(body.unitPrice)},${num(body.fixedPrice)},${num(body.discount)},
    ${num(body.deposit)},${date||null}::date,${str(body.notes,4000)}) AS id`;
   return NextResponse.json({id:result[0]?.id},{status:201});
  }
  if(body.action==='contract'){
   if(!uuid(body.proposalId))return deny('Proposta inválida.',400);
   const result=await db`SELECT public.business_create_contract(
     ${owner.user.id},${uuid(body.proposalId)}::uuid,
     ${str(body.mode,30)},${str(body.terms,8000)}) AS id`;
   return NextResponse.json({id:result[0]?.id},{status:201});
  }
  if(body.action==='dome'){
   const result=await db`SELECT public.business_create_dome(
    ${owner.user.id},${str(body.name,100)}) AS id`;
   return NextResponse.json({id:result[0]?.id},{status:201});
  }
  if(body.action==='booking'){
   if(!uuid(body.eventId)||!uuid(body.domeId))return deny('Evento ou cúpula inválidos.',400);
   const start=typeof body.start==='string'?body.start:'';
   const end=typeof body.end==='string'?body.end:'';
   if(!start||!end||!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end)))
    return deny('Datas inválidas.',400);
   const result=await db`SELECT public.business_create_booking(
    ${owner.user.id},${uuid(body.eventId)}::uuid,${uuid(body.domeId)}::uuid,
    ${start}::timestamptz,${end}::timestamptz) AS id`;
   return NextResponse.json({id:result[0]?.id},{status:201});
  }
  if(body.action==='ledger'){
   if(body.proposalId&&!uuid(body.proposalId))return deny('Proposta inválida.',400);
   const day=str(body.date,10);
   if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day))return deny('Data inválida.',400);
   const amount=num(body.amount);
   if(amount===null||amount<=0)return deny('Valor inválido.',400);
   const result=await db`SELECT public.business_create_ledger_entry(
    ${owner.user.id},${uuid(body.proposalId)}::uuid,${str(body.category,20)},
    ${str(body.status,20)},${str(body.description,250)},${amount},${day}::date) AS id`;
   return NextResponse.json({id:result[0]?.id},{status:201});
  }
  return deny('Operação desconhecida.',400);
 }catch{return deny('Operação não concluída. Verifique dados e instalação.',409);}
}
