import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';export const dynamic='force-dynamic';
const fail=(error:string,status=403)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:NextRequest){
 if(process.env.ANTARES_CLIENT_PROPOSALS_WRITES_ENABLED!=='true')return fail('Confirmação desabilitada.',503);
 const owner=await requireOwner();if(!owner)return fail('Somente proprietário.');
 try{if(req.headers.get('origin')!==new URL(process.env.ANTARES_APP_ORIGIN||'').origin)return fail('Origem não autorizada.');}
 catch{return fail('Origem não configurada.',503);}
 if(req.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return fail('Formato inválido.',415);
 if(Number(req.headers.get('content-length')||0)>4000)return fail('Requisição muito grande.',413);
 try{
  const b=await req.json();
  if(typeof b.contractId!=='string'||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(b.contractId)||
     typeof b.responsible!=='string'||b.responsible.trim().length<3||b.responsible.trim().length>180||b.confirm!==true)return fail('Dados de confirmação inválidos.',400);
  const db=getTeamWriteDb();
  const checks=await db`SELECT current_user='antares_team_runtime' AND NOT rolsuper AND NOT rolbypassrls AS safe_role,
   (SELECT count(*)=1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='antares_confirm_client_contract'
   AND p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
   AND has_function_privilege(current_user,p.oid,'EXECUTE')
   AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE')) AS safe_function
   FROM pg_roles WHERE rolname=current_user`;
  if(!checks[0]?.safe_role||!checks[0]?.safe_function)return fail('Confirmação ainda não instalada no banco.',503);
  const result=await db`SELECT public.antares_confirm_client_contract(${owner.user.id},${b.contractId}::uuid,${b.responsible}) AS id`;
  return NextResponse.json({id:result[0]?.id},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('[ANTARES][contratos] Confirmação recusada:',e instanceof Error?e.message:'Erro');return fail('Não foi possível confirmar o contrato.',409);}
}
