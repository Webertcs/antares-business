import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(data:object,status:number)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/**
 * Somente depois de a escola CONFIRMAR o orçamento por canal real.
 * Aprovação interna e abertura do PDF não contam como aceite do cliente.
 */
export async function POST(req:NextRequest){
 if(process.env.ANTARES_CRM_WRITES_ENABLED!=='true'||process.env.ANTARES_CRM_SECURITY_APPROVED!=='true')
  return reply({error:'Registro de aceite indisponível.'},503);
 try{
  const origin=process.env.ANTARES_APP_ORIGIN;
  if(!origin||req.headers.get('origin')!==new URL(origin).origin)
   return reply({error:'Origem inválida.'},403);
 }catch{return reply({error:'Origem não configurada.'},503);}
 if(req.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()!=='application/json')
  return reply({error:'Formato inválido.'},415);
 if(Number(req.headers.get('content-length')||0)>1500)
  return reply({error:'Requisição muito grande.'},413);
 try{
  const owner=await requireOwner();
  if(!owner)return reply({error:'Apenas o proprietário pode registrar o aceite.'},403);
  const raw=await req.text();
  if(raw.length>1500)return reply({error:'Requisição muito grande.'},413);
  const body=JSON.parse(raw) as Record<string,unknown>;
  if(!body||typeof body!=='object'||Array.isArray(body))return reply({error:'Dados inválidos.'},400);
  const id=body.id;
  const channel=body.channel;
  const evidence=typeof body.evidence==='string'?body.evidence.trim():'';
  if(typeof id!=='string'||!uuid.test(id)||
   !['whatsapp','written','verbal'].includes(String(channel))||
   evidence.length<10||evidence.length>500)
   return reply({error:'Informe o canal e a referência da confirmação recebida da escola.'},400);
  const sql=getTeamWriteDb();
  const security=await sql`SELECT current_user='antares_team_runtime'
   AND r.rolcanlogin AND NOT r.rolsuper AND NOT r.rolbypassrls AS safe_role,
   NOT has_table_privilege(current_user,'public.business_proposals','UPDATE') AS no_direct_write,
   has_function_privilege(current_user,'public.business_confirm_client_acceptance(text,uuid,text,text)','EXECUTE') AS safe_function
   FROM pg_roles r WHERE r.rolname=current_user`;
  if(!security[0]?.safe_role||!security[0]?.no_direct_write||!security[0]?.safe_function)
   return reply({error:'Função de aceite ainda não homologada no Neon.'},503);
  const result=await sql`SELECT public.business_confirm_client_acceptance(
   ${owner.user.id},${id}::uuid,${String(channel)},${evidence}) AS status`;
  return reply({ok:true,status:result[0]?.status},200);
 }catch{return reply({error:'Aceite não registrado. Confira a aprovação interna, validade, dados e permissões.'},409);}
}
