import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';
import {assertAgendaWriteAllowed} from '@/lib/equipe/agenda-write-guard';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(error:string,status:number)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** Vínculo explícito de uma reserva legada ao evento operacional, sem duplicar apresentações. */
export async function POST(req:NextRequest){
 const ctx=await requireOwner();if(!ctx)return reply('Somente proprietário.',403);
 const denied=await assertAgendaWriteAllowed(req);if(denied)return denied;
 if(Number(req.headers.get('content-length')||0)>500)return reply('Requisição excessiva.',413);
 try{
  const raw=await req.text();if(raw.length>500)return reply('Requisição excessiva.',413);
  const body=JSON.parse(raw) as Record<string,unknown>;
  if(!body||typeof body.presentationId!=='string'||!uuid.test(body.presentationId))
   return reply('Apresentação inválida.',400);
  const db=getTeamWriteDb();
  const checks=await db`SELECT current_user='antares_team_runtime' AND NOT r.rolsuper AND NOT r.rolbypassrls AS role_ok,
    p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner' AND has_function_privilege(current_user,p.oid,'EXECUTE')
    AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x
      WHERE x.grantee=0 AND x.privilege_type='EXECUTE') AS function_ok
    FROM pg_roles r CROSS JOIN pg_proc p WHERE r.rolname=current_user
    AND p.oid=to_regprocedure('public.antares_link_reservation_event(text,uuid,uuid)')`;
  if(!checks[0]?.role_ok||!checks[0]?.function_ok)
   return reply('Vínculo operacional ainda não habilitado no Neon.',503);
  const result=await db`SELECT public.antares_link_reservation_event(
   ${ctx.user.id},${ctx.organizationId}::uuid,${body.presentationId}::uuid) AS event_id`;
  return NextResponse.json({ok:true,eventId:result[0]?.event_id},{headers:{'Cache-Control':'no-store'}});
 }catch{return reply('Não foi possível vincular. Confira a reserva, o evento existente e as permissões.',409);}
}
