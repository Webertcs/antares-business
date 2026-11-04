import {NextRequest,NextResponse} from 'next/server';
import {requireMember,requireOwner,getDb,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const noStore={'Cache-Control':'private, no-store'};
async function verifyRuntime(){
 const sql=getTeamWriteDb();
 const result=await sql`SELECT
 current_user='antares_team_runtime' AND NOT r.rolsuper AND NOT r.rolbypassrls AS safe_role,
 (SELECT count(*)=2 FROM pg_class c WHERE c.oid IN ('public.antares_checklist_templates'::regclass,'public.antares_checklist_template_items'::regclass)
  AND c.relrowsecurity AND NOT has_table_privilege(current_user,c.oid,'SELECT')
  AND NOT has_table_privilege(current_user,c.oid,'INSERT')
  AND NOT has_table_privilege(current_user,c.oid,'UPDATE')
  AND NOT has_table_privilege(current_user,c.oid,'DELETE')) AS safe_tables,
 (SELECT count(*)=2 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
  AND p.proname IN ('antares_save_checklist_template','antares_apply_checklist_template')
  AND p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
  AND has_function_privilege(current_user,p.oid,'EXECUTE')
  AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    WHERE a.grantee=0 AND a.privilege_type='EXECUTE')) AS safe_functions
 FROM pg_roles r WHERE r.rolname=current_user`;
 if(!result[0]?.safe_role||!result[0]?.safe_tables||!result[0]?.safe_functions)throw Error('Isolamento não verificado');
 return sql;
}
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const ctx=await requireMember();if(!ctx)return NextResponse.json({error:'Acesso não autorizado.'},{status:403});
  const {id}=await params;if(!uuid.test(id))return NextResponse.json({error:'Evento inválido.'},{status:400});
  const db=getDb();
  const events=await db`SELECT id FROM public.crm_events WHERE id=${id} AND organization_id=${ctx.organizationId} LIMIT 1`;
  if(!events.length)return NextResponse.json({error:'Evento não encontrado.'},{status:404});
  const templates=await db`SELECT t.id,t.name,t.updated_at,coalesce(
   (SELECT json_agg(i.label ORDER BY i.position,i.id) FROM public.antares_checklist_template_items i
    WHERE i.template_id=t.id AND i.organization_id=${ctx.organizationId}), '[]'::json) AS items
   FROM public.antares_checklist_templates t WHERE t.organization_id=${ctx.organizationId}
   ORDER BY t.name LIMIT 100`;
  return NextResponse.json({templates},{headers:noStore});
 }catch{return NextResponse.json({error:'Modelos indisponíveis.'},{status:503,headers:noStore})}
}
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(process.env.ANTARES_EVENT_OPERATIONS_WRITES_ENABLED!=='true')
  return NextResponse.json({error:'Gravações bloqueadas.'},{status:503});
 const ctx=await requireOwner();if(!ctx)return NextResponse.json({error:'Somente proprietário.'},{status:403});
 let allowed='';try{allowed=new URL(process.env.ANTARES_APP_ORIGIN||'').origin}catch{return NextResponse.json({error:'Origem não configurada.'},{status:503})}
 if(req.headers.get('origin')!==allowed||req.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()!=='application/json')
  return NextResponse.json({error:'Origem ou conteúdo inválido.'},{status:403});
 if(Number(req.headers.get('content-length')||0)>16000)return NextResponse.json({error:'Requisição muito grande.'},{status:413});
 const {id}=await params;if(!uuid.test(id))return NextResponse.json({error:'Evento inválido.'},{status:400});
 try{
  const body=await req.json();const db=getDb();
  const events=await db`SELECT id FROM public.crm_events WHERE id=${id} AND organization_id=${ctx.organizationId} LIMIT 1`;
  if(!events.length)return NextResponse.json({error:'Evento não encontrado.'},{status:404});
  const sql=await verifyRuntime();
  if(body.action==='save'){
   const name=typeof body.name==='string'?body.name.trim():'';
   const items=body.items;
   const templateId=body.templateId==null?null:String(body.templateId);
   if(name.length<1||name.length>120||!Array.isArray(items)||items.length<1||items.length>100
    ||items.some((x:unknown)=>typeof x!=='string'||x.trim().length<1||x.trim().length>180)
    ||new Set(items.map((x:string)=>x.trim().toLocaleLowerCase())).size!==items.length
    ||(templateId!==null&&!uuid.test(templateId)))
    return NextResponse.json({error:'Modelo inválido.'},{status:400});
   const labels=items.map((x:string)=>x.trim());
   const result=await sql`SELECT public.antares_save_checklist_template(${ctx.user.id},${ctx.organizationId}::uuid,${templateId}::uuid,${name},${labels}::text[]) AS id`;
   return NextResponse.json({ok:true,id:result[0]?.id},{headers:noStore});
  }
  if(body.action==='apply'){
   const templateId=typeof body.templateId==='string'?body.templateId:'';
   if(!uuid.test(templateId))return NextResponse.json({error:'Modelo inválido.'},{status:400});
   const result=await sql`SELECT public.antares_apply_checklist_template(${ctx.user.id},${id}::uuid,${templateId}::uuid) AS added`;
   return NextResponse.json({ok:true,added:result[0]?.added},{headers:noStore});
  }
  return NextResponse.json({error:'Ação inválida.'},{status:400});
 }catch{return NextResponse.json({error:'Não foi possível concluir. Verifique permissões e dados.'},{status:409})}
}
