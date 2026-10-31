import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getDb,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const respond=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){
 try {
  const owner=await requireOwner();
  if(!owner)return respond({error:'Somente o proprietário pode acessar solicitações.'},403);
  const db=getDb();
  const rows=await db`SELECT id,responsible_name,institution,city,phone,audience,attendees,
    desired_date,notes,status,created_at FROM public.vitrine_leads
    WHERE organization_id=${owner.organizationId}
    ORDER BY created_at DESC LIMIT 300`;
  return respond({leads:rows});
 }catch{return respond({error:'Caixa de entrada indisponível. Verifique a implantação da migração 05.'},503);}
}
export async function POST(request:NextRequest){
 if(process.env.ANTARES_CRM_WRITES_ENABLED!=='true' ||
    process.env.ANTARES_CRM_SECURITY_APPROVED!=='true')
   return respond({error:'Revisão de solicitações em homologação.'},503);
 let origin:string;
 try{origin=new URL(process.env.ANTARES_APP_ORIGIN||'').origin;}
 catch{return respond({error:'Origem não configurada.'},503);}
 if(request.headers.get('origin')!==origin)return respond({error:'Origem não autorizada.'},403);
 if(request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()!=='application/json')
   return respond({error:'Formato inválido.'},415);
 if(Number(request.headers.get('content-length')||0)>1000)return respond({error:'Payload inválido.'},413);
 try{
  const owner=await requireOwner();
  if(!owner)return respond({error:'Somente proprietário.'},403);
  const raw=await request.text();
  if(raw.length>1000)return respond({error:'Payload inválido.'},413);
  const body=JSON.parse(raw) as Record<string,unknown>;
  if(!body||typeof body!=='object'||Array.isArray(body))return respond({error:'Pedido inválido.'},400);
  const id=typeof body.id==='string'?body.id:'';
  const status=body.status;
  if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)||
     !['pending','reviewing','archived'].includes(String(status)))
    return respond({error:'Status ou identificação inválidos.'},400);
  const sql=getTeamWriteDb();
  const safety=await sql`SELECT current_user='antares_team_runtime'
    AND r.rolcanlogin AND NOT r.rolsuper AND NOT r.rolbypassrls AS safe_role,
    NOT has_table_privilege(current_user,'public.vitrine_leads','SELECT')
    AND NOT has_table_privilege(current_user,'public.vitrine_leads','UPDATE') AS safe_table,
    has_function_privilege(current_user,'public.vitrine_review_lead(text,uuid,text)','EXECUTE') AS safe_function
    FROM pg_roles r WHERE r.rolname=current_user`;
  if(!safety[0]?.safe_role||!safety[0]?.safe_table||!safety[0]?.safe_function)
    return respond({error:'Permissões de revisão não homologadas.'},503);
  await sql`SELECT public.vitrine_review_lead(${owner.user.id},${id}::uuid,${String(status)})`;
  return respond({ok:true});
 }catch{return respond({error:'Não foi possível revisar a solicitação.'},409);}
}
