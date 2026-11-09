import {NextRequest,NextResponse} from 'next/server';
import {requireMember,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export async function POST(req:NextRequest){
 const ctx=await requireMember();
 if(!ctx||ctx.role!=='owner')return NextResponse.json({error:'Acesso restrito.'},{status:403});
 let origin:string;
 try{origin=new URL(process.env.ANTARES_APP_ORIGIN||'').origin;}catch{return NextResponse.json({error:'Origem não configurada.'},{status:503});}
 if(req.headers.get('origin')!==origin||req.headers.get('content-type')?.split(';')[0]!=='application/json')return NextResponse.json({error:'Requisição não autorizada.'},{status:403});
 if(Number(req.headers.get('content-length')||0)>2048)return NextResponse.json({error:'Requisição muito grande.'},{status:413});
 try{
 const body=await req.json();
 if(!uuid.test(body.eventId)||!(body.domeId===null||uuid.test(body.domeId)))return NextResponse.json({error:'Identificadores inválidos.'},{status:400});
 const sql=getTeamWriteDb();
 const safety=await sql`SELECT current_user='antares_team_runtime' AND NOT r.rolsuper AND NOT r.rolbypassrls AS safe,
 p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner' AND has_function_privilege(current_user,p.oid,'EXECUTE') AS allowed
 FROM pg_roles r CROSS JOIN pg_proc p WHERE r.rolname=current_user AND p.oid=to_regprocedure('public.antares_assign_event_dome(text,uuid,uuid)')`;
 if(!safety[0]?.safe||!safety[0]?.allowed)return NextResponse.json({error:'Atribuição ainda não habilitada no banco.'},{status:503});
 await sql`SELECT public.antares_assign_event_dome(${ctx.user.id},${body.eventId}::uuid,${body.domeId}::uuid)`;
 return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'Não foi possível atribuir a cúpula. Confira as permissões e tente novamente.'},{status:409});}
}
