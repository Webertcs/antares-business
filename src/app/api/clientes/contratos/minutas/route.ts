import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getDb,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const fail=(error:string,status=400)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:NextRequest){
 const owner=await requireOwner();if(!owner)return fail('Somente proprietário.',403);
 const contractId=new URL(req.url).searchParams.get('contractId');
 if(!contractId||!uuid.test(contractId))return fail('Contrato inválido.');
 try{
  const db=getDb();
  const rows=await db`SELECT d.id,d.contract_id,d.title,d.institution,d.responsible,d.object_text,d.terms,d.version_number,d.archived_at,d.deleted_at
  FROM public.antares_contract_drafts d
  JOIN public.business_contracts c ON c.id=d.contract_id AND c.organization_id=d.organization_id
  WHERE d.organization_id=${owner.organizationId} AND d.contract_id=${contractId}::uuid AND d.deleted_at IS NULL
  ORDER BY d.updated_at DESC LIMIT 30`;
  return NextResponse.json({drafts:rows},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return fail('Não foi possível consultar as minutas.',503);}
}
export async function POST(req:NextRequest){
 const owner=await requireOwner();if(!owner)return fail('Somente proprietário.',403);
 let expectedOrigin:string;try{expectedOrigin=new URL(process.env.ANTARES_APP_ORIGIN||'').origin;}catch{return fail('Origem não configurada.',503);}
 if(req.headers.get('origin')!==expectedOrigin)return fail('Origem não autorizada.',403);
 if(req.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return fail('Formato inválido.',415);
 if(Number(req.headers.get('content-length')||0)>30000)return fail('Requisição muito grande.',413);
 try{
  const b=await req.json();
  if(!b||typeof b!=='object'||typeof b.contractId!=='string'||!uuid.test(b.contractId)||
   (b.draftId!==null&&b.draftId!==undefined&&(typeof b.draftId!=='string'||!uuid.test(b.draftId)))||
   ![['title',3,200],['institution',2,200],['responsible',0,180],['object',0,8000],['terms',0,16000]].every(([key,min,max])=>typeof b[key as string]==='string'&&(b[key as string] as string).trim().length>=Number(min)&&(b[key as string] as string).length<=Number(max)))return fail('Dados da minuta inválidos.');
  const db=getTeamWriteDb();
  const checks=await db`SELECT current_user='antares_team_runtime' AND NOT rolsuper AND NOT rolbypassrls AS safe_role,
   EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='antares_save_contract_draft'
   AND p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
   AND has_function_privilege(current_user,p.oid,'EXECUTE')
   AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE')) AS safe_function`;
  if(!checks[0]?.safe_role||!checks[0]?.safe_function)return fail('Salvamento ainda não autorizado.',503);
  const result=await db`SELECT public.antares_save_contract_draft(${owner.user.id},${b.contractId}::uuid,${b.draftId||null}::uuid,${b.title},${b.institution},${b.responsible},${b.object},${b.terms}) AS id`;
  return NextResponse.json({id:result[0]?.id},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('[ANTARES][minutas]',e instanceof Error?e.message:'Erro');return fail('Não foi possível salvar a minuta.',409);}
}
