import {NextRequest,NextResponse} from 'next/server';
import {requireMember,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export async function POST(req:NextRequest){
 const ctx=await requireMember();
 if(!ctx||ctx.role!=='owner')return NextResponse.json({error:'Somente o proprietário pode alterar eventos.'},{status:403});
 let origin:string;try{origin=new URL(process.env.ANTARES_APP_ORIGIN||'').origin;}catch{return NextResponse.json({error:'Origem não configurada.'},{status:503});}
 if(req.headers.get('origin')!==origin||req.headers.get('content-type')?.split(';')[0]!=='application/json')return NextResponse.json({error:'Requisição não autorizada.'},{status:403});
 if(Number(req.headers.get('content-length')||0)>4096)return NextResponse.json({error:'Requisição muito grande.'},{status:413});
 try{
  const body=await req.json();
  if(typeof body.eventId!=='string'||!uuid.test(body.eventId)||!['cancel','archive','restore'].includes(body.action)||typeof body.reason!=='string'||body.reason.length>1000)
   return NextResponse.json({error:'Dados inválidos.'},{status:400});
  if(body.action==='cancel'&&body.reason.trim().length<5)return NextResponse.json({error:'Informe o motivo do cancelamento.'},{status:400});
  const sql=getTeamWriteDb();
  const safety=await sql`SELECT current_user='antares_team_runtime' AND NOT r.rolsuper AND NOT r.rolbypassrls AS safe,
  p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner' AND has_function_privilege(current_user,p.oid,'EXECUTE') AS allowed
  FROM pg_roles r CROSS JOIN pg_proc p WHERE r.rolname=current_user AND p.oid=to_regprocedure('public.antares_manage_event_lifecycle(text,uuid,text,text)')`;
  if(!safety[0]?.safe||!safety[0]?.allowed)return NextResponse.json({error:'Não é possível alterar este evento neste momento.'},{status:503});
  await sql`SELECT public.antares_manage_event_lifecycle(${ctx.user.id},${body.eventId}::uuid,${body.action},${body.reason})`;
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'Não foi possível concluir. Verifique vínculos do evento e permissões.'},{status:409});}
}
