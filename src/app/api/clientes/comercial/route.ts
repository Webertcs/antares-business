import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';export const dynamic='force-dynamic';
const fail=(error:string,status=403)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:NextRequest){
 if(process.env.ANTARES_CLIENT_PROPOSALS_WRITES_ENABLED!=='true')return fail('Comercial desabilitado.',503);
 const owner=await requireOwner();if(!owner)return fail('Somente proprietário.');
 try{if(req.headers.get('origin')!==new URL(process.env.ANTARES_APP_ORIGIN||'').origin)return fail('Origem não autorizada.');}
 catch{return fail('Origem não configurada.',503);}
 if(req.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return fail('Formato inválido.',415);
 if(Number(req.headers.get('content-length')||0)>12000)return fail('Requisição muito grande.',413);
 try{
 const b=await req.json();
 if(typeof b.proposalId!=='string'||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(b.proposalId)||
 !['sent','accepted','rejected','contract','archive','restore'].includes(b.action))return fail('Operação inválida.',400);
 const mode=b.action==='contract'?b.mode:null,terms=b.action==='contract'?b.terms:null;
 if(b.action==='contract'&&(!['written','verbal','whatsapp'].includes(mode)||typeof terms!=='string'||terms.trim().length<8||terms.length>8000))return fail('Contrato inválido.',400);
 const db=getTeamWriteDb();
 const checks=await db`SELECT current_user='antares_team_runtime' AND NOT rolsuper AND NOT rolbypassrls AS safe_role,
 (SELECT count(*)=1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='antares_client_proposal_action'
 AND p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
 AND has_function_privilege(current_user,p.oid,'EXECUTE')
 AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE')) AS safe_function
 FROM pg_roles WHERE rolname=current_user`;
 if(!checks[0]?.safe_role||!checks[0]?.safe_function)return fail('Permissões não verificadas.',503);
 if(b.action==='archive'||b.action==='restore'){
  const permission=await db`SELECT count(*)=1 AS ok FROM pg_proc p
    WHERE p.pronamespace='public'::regnamespace AND p.proname='antares_archive_client_proposal'
    AND p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
    AND has_function_privilege(current_user,p.oid,'EXECUTE')
    AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      WHERE a.grantee=0 AND a.privilege_type='EXECUTE')`;
  if(!permission[0]?.ok)return fail('Arquivamento ainda não instalado.',503);
  const archived=await db`SELECT public.antares_archive_client_proposal(${owner.user.id},${b.proposalId}::uuid,${b.action==='archive'}) AS id`;
  return NextResponse.json({id:archived[0]?.id},{headers:{'Cache-Control':'no-store'}});
 }
 const result=await db`SELECT public.antares_client_proposal_action(${owner.user.id},${b.proposalId}::uuid,${b.action},${mode},${terms}) AS id`;
 return NextResponse.json({id:result[0]?.id},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('[ANTARES][comercial] Operação recusada:',e instanceof Error?e.message:'Erro');return fail('Não foi possível concluir a operação.',409);}
}
