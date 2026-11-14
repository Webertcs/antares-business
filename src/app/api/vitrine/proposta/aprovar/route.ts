import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
const response=(data:object,status:number)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(req:NextRequest){
 if(process.env.ANTARES_CRM_WRITES_ENABLED!=='true'||process.env.ANTARES_CRM_SECURITY_APPROVED!=='true')return response({error:'Operação indisponível'},503);
 try{if(req.headers.get('origin')!==new URL(process.env.ANTARES_APP_ORIGIN||'').origin)return response({error:'Origem inválida'},403);}
 catch{return response({error:'Origem não configurada'},503);}
 if(req.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return response({error:'Formato inválido'},415);
 const raw=await req.text();if(raw.length>3000)return response({error:'Dados excessivos'},413);
 try{
  const owner=await requireOwner();if(!owner)return response({error:'Acesso exclusivo do proprietário'},403);
  const b=JSON.parse(raw);
  if(!b||typeof b.id!=='string'||!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(b.id)||typeof b.terms!=='string'||b.terms.length>2000||typeof b.approve!=='boolean'||(b.valid!==null&&!(typeof b.valid==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(b.valid))))return response({error:'Dados inválidos'},400);
  const db=getTeamWriteDb();
  const safe=await db`SELECT current_user='antares_team_runtime' AND NOT r.rolsuper AND NOT r.rolbypassrls AS role_ok,
  NOT has_table_privilege(current_user,'public.business_proposals','UPDATE') AS table_ok,
  has_function_privilege(current_user,'public.business_manage_draft(text,uuid,date,text,boolean)','EXECUTE') AS fn_ok FROM pg_roles r WHERE r.rolname=current_user`;
  if(!safe[0]?.role_ok||!safe[0]?.table_ok||!safe[0]?.fn_ok)return response({error:'Não foi possível confirmar a autorização para aprovar esta proposta'},503);
  const result=await db`SELECT public.business_manage_draft(${owner.user.id},${b.id}::uuid,${b.valid}::date,${b.terms},${b.approve}) AS status`;
  return response({ok:true,status:result[0]?.status},200);
 }catch{return response({error:'Não foi possível concluir. Confira validade, condições e situação do rascunho.'},409);}
}
