import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 const answer=(body:object,status:number)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
 if(process.env.ANTARES_CRM_WRITES_ENABLED!=='true'||process.env.ANTARES_CRM_SECURITY_APPROVED!=='true'||
    process.env.ANTARES_VITRINE_CONVERSION_ENABLED!=='true')
  return answer({error:'Conversão ainda em homologação.'},503);
 let origin:string;try{origin=new URL(process.env.ANTARES_APP_ORIGIN||'').origin;}
 catch{return answer({error:'Configuração incompleta.'},503);}
 if(request.headers.get('origin')!==origin)return answer({error:'Origem inválida.'},403);
 if(request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()!=='application/json')
  return answer({error:'Formato inválido.'},415);
 if(Number(request.headers.get('content-length')||0)>500)return answer({error:'Requisição grande.'},413);
 try{
  const owner=await requireOwner();
  if(!owner)return answer({error:'Somente proprietário.'},403);
  const raw=await request.text();if(raw.length>500)return answer({error:'Requisição grande.'},413);
  const body=JSON.parse(raw) as Record<string,unknown>;
  const id=typeof body?.id==='string'?body.id:'';
  if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))
    return answer({error:'Identificador inválido.'},400);
  const sql=getTeamWriteDb();
  const security=await sql`SELECT current_user='antares_team_runtime'
    AND r.rolcanlogin AND NOT r.rolsuper AND NOT r.rolbypassrls AS safe_role,
    NOT has_table_privilege(current_user,'public.vitrine_leads','SELECT')
    AND NOT has_table_privilege(current_user,'public.vitrine_leads','INSERT')
    AND NOT has_table_privilege(current_user,'public.vitrine_leads','UPDATE') AS safe_table,
    has_function_privilege(current_user,'public.vitrine_convert_lead(text,uuid)','EXECUTE') AS safe_function
    FROM pg_roles r WHERE r.rolname=current_user`;
  if(!security[0]?.safe_role||!security[0]?.safe_table||!security[0]?.safe_function)
    return answer({error:'Isolamento não homologado.'},503);
  const result=await sql`SELECT * FROM public.vitrine_convert_lead(${owner.user.id},${id}::uuid)`;
  return answer({ok:true,clientId:result[0]?.client_id,proposalId:result[0]?.proposal_id},200);
 }catch{return answer({error:'Conversão não concluída. Confira migrações e permissões.'},409);}
}
