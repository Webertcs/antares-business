import {NextResponse} from 'next/server';
import {requireMember,getDb,getTeamWriteDb} from '@/lib/equipe/auth';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const reply=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){
 const ctx=await requireMember();if(!ctx)return reply({error:'Nao autorizado'},403);
 try{const db=getDb();const rows=await db`SELECT display_name,photo_data FROM public.antares_member_profiles WHERE organization_id=${ctx.organizationId}::uuid AND member_id=${ctx.memberId}::uuid LIMIT 1`;
 return reply({profile:rows[0]||null});}catch{return reply({profile:null,pendingMigration:true})}
}
export async function PUT(req:Request){
 const ctx=await requireMember();if(!ctx)return reply({error:'Nao autorizado'},403);
 try{
  const body=await req.json();const name=body?.alias,photo=body?.photo;
  if(typeof name!=='string'||!name.trim()||name.trim().length>120||typeof photo!=='string'||photo.length>180000||(photo!==''&&!/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(photo)))return reply({error:'Nome ou foto invalidos'},400);
  const db=getTeamWriteDb();
  const safe=await db`SELECT p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner' AND has_function_privilege(current_user,p.oid,'EXECUTE') AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE x.grantee=0 AND x.privilege_type='EXECUTE') AS safe FROM pg_proc p WHERE p.oid=to_regprocedure('public.antares_save_member_profile(text,uuid,uuid,text,text)')`;
  if(!safe[0]?.safe)return reply({error:'Não foi possível atualizar o perfil neste momento.'},503);
  await db`SELECT public.antares_save_member_profile(${ctx.user.id},${ctx.organizationId}::uuid,${ctx.memberId}::uuid,${name.trim()},${photo||null})`;
  return reply({ok:true});
 }catch{return reply({error:'Nao foi possivel sincronizar o perfil'},503)}
}
