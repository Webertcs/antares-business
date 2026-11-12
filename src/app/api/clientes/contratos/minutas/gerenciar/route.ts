import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const error=(message:string,status=400)=>NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}});

export async function POST(request:NextRequest){
 const owner=await requireOwner();
 if(!owner)return error('Apenas o proprietário pode gerenciar minutas.',403);
 let origin:string;
 try{origin=new URL(process.env.ANTARES_APP_ORIGIN||'').origin;}catch{return error('Origem da aplicação não configurada.',503);}
 if(request.headers.get('origin')!==origin)return error('Origem não autorizada.',403);
 if(request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return error('Formato inválido.',415);
 if(Number(request.headers.get('content-length')||0)>10000)return error('Requisição muito grande.',413);
 try{
  const body=await request.json();
  if(!body||typeof body.draftId!=='string'||!uuid.test(body.draftId)||!['archive','restore'].includes(body.action))return error('Operação inválida.');
  const db=getTeamWriteDb();
  const checks=await db`SELECT current_user='antares_team_runtime' AND NOT rolsuper AND NOT rolbypassrls AS safe_role,
    EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='antares_manage_contract_draft'
      AND p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
      AND has_function_privilege(current_user,p.oid,'EXECUTE')
      AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE')) AS safe_function`;
  if(!checks[0]?.safe_role||!checks[0]?.safe_function)return error('Gerenciamento ainda não autorizado.',503);
  const result=await db`SELECT public.antares_manage_contract_draft(${owner.user.id},${body.draftId}::uuid,${body.action}) AS message`;
  return NextResponse.json({message:result[0]?.message},{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  console.error('[ANTARES][minutas-gerenciar]',e instanceof Error?e.message:'Erro');
  return error('Não foi possível concluir a operação. Confira as permissões e tente novamente.',409);
 }
}
