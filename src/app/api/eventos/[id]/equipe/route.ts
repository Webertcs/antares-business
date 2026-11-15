import {NextResponse} from 'next/server';
import {requireOwner,getDb,getTeamWriteDb} from '@/lib/equipe/auth';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const ctx=await requireOwner();
  if(!ctx)return NextResponse.json({error:'Apenas o proprietário pode consultar o cadastro de colaboradores.'},{status:403});
  const {id}=await params;
  if(!uuid.test(id))return NextResponse.json({error:'Evento inválido'},{status:400});
  const db=getDb();
  const events=await db`SELECT id FROM public.crm_events WHERE id=${id}::uuid AND organization_id=${ctx.organizationId}::uuid LIMIT 1`;
  if(!events.length)return NextResponse.json({error:'Evento não encontrado'},{status:404});
  const assignments=await db`SELECT member_id FROM public.antares_event_team_assignments WHERE organization_id=${ctx.organizationId}::uuid AND event_id=${id}::uuid ORDER BY member_id`;
  const members=await db`SELECT t.id,COALESCE(NULLIF(p.display_name,''),t.full_name) AS full_name,t.email,p.photo_data FROM public.team_members t LEFT JOIN public.antares_member_profiles p ON p.organization_id=t.organization_id AND p.member_id=t.id WHERE t.organization_id=${ctx.organizationId}::uuid AND t.role='collaborator' AND t.active=true ORDER BY t.full_name,t.id`;
  return NextResponse.json({members,selectedIds:assignments.map(a=>String(a.member_id))},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Equipe indisponível'},{status:503})}
}

export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const ctx=await requireOwner();if(!ctx)return NextResponse.json({error:'Somente proprietário'},{status:403});
  const {id}=await params;if(!uuid.test(id))return NextResponse.json({error:'Evento inválido'},{status:400});
  const body=await req.json();if(!Array.isArray(body.memberIds)||body.memberIds.length>30||body.memberIds.some((v:unknown)=>typeof v!=='string'||!uuid.test(v))||new Set(body.memberIds).size!==body.memberIds.length)return NextResponse.json({error:'Seleção inválida'},{status:400});
  const db=getTeamWriteDb();
  const check=await db`SELECT p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner' AND has_function_privilege(current_user,p.oid,'EXECUTE') AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE x.grantee=0 AND x.privilege_type='EXECUTE') AS safe FROM pg_proc p WHERE p.oid=to_regprocedure('public.antares_set_event_team(text,uuid,uuid,uuid[])')`;
  if(!check[0]?.safe)return NextResponse.json({error:'Gravação segura da equipe ainda não implantada no Neon.'},{status:503});
  await db`SELECT public.antares_set_event_team(${ctx.user.id},${ctx.organizationId}::uuid,${id}::uuid,${body.memberIds}::uuid[])`;
  return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Não foi possível salvar a equipe. Verifique as permissões e os colaboradores.'},{status:409})}
}
