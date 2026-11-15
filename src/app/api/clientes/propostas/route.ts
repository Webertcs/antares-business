import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const fail=(error:string,status=403)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:NextRequest){
 if(process.env.ANTARES_CLIENT_PROPOSALS_WRITES_ENABLED!=='true')return fail('Cadastro de propostas ainda não habilitado.',503);
 const owner=await requireOwner();if(!owner)return fail('Somente proprietário.');
 const origin=process.env.ANTARES_APP_ORIGIN;
 if(!origin)return fail('Origem não configurada.',503);
 try{if(req.headers.get('origin')!==new URL(origin).origin)return fail('Origem não autorizada.');}
 catch{return fail('Origem inválida.',503);}
 if(req.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return fail('Formato inválido.',415);
 if(Number(req.headers.get('content-length')||0)>12000)return fail('Requisição muito grande.',413);
 try{
  const body=await req.json();
  const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
  const money=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=10000000;
  const title=typeof body.title==='string'?body.title.trim():'';
  const notes=typeof body.notes==='string'?body.notes.trim():'';
  const date=body.validUntil;
  if(!uuid(body.clientId)||title.length<2||title.length>180||notes.length>4000||
     !['per_student','fixed','complimentary'].includes(body.model)||
     !Number.isInteger(body.attendees)||body.attendees<0||body.attendees>100000||
     ![body.unitPrice,body.fixedPrice,body.discount,body.deposit].every(money)||
     (date!==''&&date!==null&&date!==undefined&&!(typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date))))
     return fail('Dados inválidos.',400);
  const db=getTeamWriteDb();
  const check=await db`SELECT current_user='antares_team_runtime' AND NOT rolsuper AND NOT rolbypassrls AS safe_role,
  (SELECT count(*)=1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
    AND p.proname='antares_create_client_proposal' AND p.prosecdef
    AND pg_get_userbyid(p.proowner)='neondb_owner'
    AND has_function_privilege(current_user,p.oid,'EXECUTE')
    AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
      WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE')) AS safe_function
    FROM pg_roles WHERE rolname=current_user`;
  if(!check[0]?.safe_role||!check[0]?.safe_function)return fail('Permissões não verificadas.',503);
  const result=await db`SELECT public.antares_create_client_proposal(
    ${owner.user.id},${body.clientId}::uuid,${title},${body.model},${body.attendees},
    ${body.unitPrice},${body.fixedPrice},${body.discount},${body.deposit},
    ${date||null}::date,${notes}) AS id`;
  return NextResponse.json({id:result[0]?.id},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch(error){console.error('[ANTARES][propostas] Falha de gravação:',error instanceof Error?error.message:'Erro desconhecido');return fail('Não foi possível cadastrar a proposta. Verifique as informações.',409);}
}
