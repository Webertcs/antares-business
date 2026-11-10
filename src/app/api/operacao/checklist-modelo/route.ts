import { NextRequest, NextResponse } from 'next/server';
import { requireMember, requireOwner, getTeamWriteDb } from '@/lib/equipe/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) => NextResponse.json(data, {status, headers:{'Cache-Control':'no-store'}});
const safeDb = async () => {
  const db = getTeamWriteDb();
  const checks = await db`SELECT current_user='antares_team_runtime' AND NOT rolsuper AND NOT rolbypassrls AS safe_role,
    (SELECT count(*)=2 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
    AND p.proname IN ('antares_save_checklist_template','antares_read_checklist_template')
    AND p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
    AND has_function_privilege(current_user,p.oid,'EXECUTE')
    AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
      WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE')) AS safe_functions
    FROM pg_roles WHERE rolname=current_user`;
  if(!checks[0]?.safe_role || !checks[0]?.safe_functions) {
    const details = await db`SELECT p.proname AS function_name, pg_get_userbyid(p.proowner)='neondb_owner' AS owner_ok,
      p.prosecdef AS security_definer, has_function_privilege(current_user,p.oid,'EXECUTE') AS runtime_execute,
      NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
        WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE') AS public_revoked
      FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
      AND p.proname IN ('antares_save_checklist_template','antares_read_checklist_template')`;
    console.error('[ANTARES][checklist] Diagnóstico das funções:', details.map(row=>({
      function_name:row.function_name, owner_ok:row.owner_ok, security_definer:row.security_definer,
      runtime_execute:row.runtime_execute, public_revoked:row.public_revoked
    })));
    console.error('[ANTARES][checklist] Diagnóstico de permissões:', {safe_role: checks[0]?.safe_role === true, safe_functions: checks[0]?.safe_functions === true});
    throw new Error('Permissões não verificadas');
  }
  return db;
};
export async function GET(){
  const member=await requireMember();
  if(!member)return json({error:'Acesso negado'},403);
  try{
    const db=await safeDb();
    const result=await db`SELECT public.antares_read_checklist_template(${member.user.id}) AS items`;
    return json({items:result[0]?.items??[],canEdit:member.role==='owner'});
  }catch(error){
    console.error('[ANTARES][checklist] Leitura:',error instanceof Error?error.message:'Erro');
    return json({error:'Não foi possível carregar o modelo. Verifique a configuração do banco.'},503);
  }
}
export async function PUT(req:NextRequest){
  const owner=await requireOwner();
  if(!owner)return json({error:'Somente o proprietário pode alterar o modelo.'},403);
  const origin=process.env.ANTARES_APP_ORIGIN;
  if(!origin)return json({error:'Origem não configurada.'},503);
  try{if(req.headers.get('origin')!==new URL(origin).origin)return json({error:'Origem não autorizada.'},403);}
  catch{return json({error:'Origem inválida.'},403);}
  if(req.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return json({error:'Formato inválido.'},415);
  if(Number(req.headers.get('content-length')||0)>26000)return json({error:'Requisição muito grande.'},413);
  try{
    const body=await req.json();
    const items=body?.items;
    if(!Array.isArray(items)||items.length>80||items.some((v:unknown)=>typeof v!=='string'||v.trim().length<2||v.trim().length>160)||
      JSON.stringify(items).length>24000)return json({error:'Informe até 80 itens de 2 a 160 caracteres.'},400);
    const db=await safeDb();
    await db`SELECT public.antares_save_checklist_template(${owner.user.id},${JSON.stringify(items.map((v:string)=>v.trim()))}::jsonb)`;
    return json({saved:true});
  }catch(error){
    console.error('[ANTARES][checklist] Gravação:',error instanceof Error?error.message:'Erro');
    return json({error:'Não foi possível salvar o modelo.'},503);
  }
}