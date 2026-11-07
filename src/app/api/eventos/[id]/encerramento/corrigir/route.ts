import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const unavailable=()=>NextResponse.json({error:'Correção aguardando implantação e homologação no Neon'},{status:503});
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(process.env.ANTARES_EVENT_ATTENDANCE_CORRECTIONS_ENABLED!=='true')return unavailable();
 const ctx=await requireOwner();if(!ctx)return NextResponse.json({error:'Somente proprietário'},{status:403});
 const {id}=await params;if(!uuid.test(id))return NextResponse.json({error:'Evento inválido'},{status:400});
 let origin='';try{origin=new URL(process.env.ANTARES_APP_ORIGIN||'').origin}catch{return unavailable()}
 if(req.headers.get('origin')!==origin||req.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()!=='application/json')
  return NextResponse.json({error:'Origem ou conteúdo inválido'},{status:403});
 if(Number(req.headers.get('content-length')||'0')>2000)return NextResponse.json({error:'Requisição excessiva'},{status:413});
 let body:unknown;try{body=await req.json()}catch{return NextResponse.json({error:'JSON inválido'},{status:400})}
 const input=body as {students?:unknown;reason?:unknown}|null;
 const students=input?.students,reason=input?.reason;
 if(typeof students!=='number'||!Number.isInteger(students)||students<0||students>100000||typeof reason!=='string'||reason.trim().length<5||reason.trim().length>500)
  return NextResponse.json({error:'Informe quantidade válida e motivo com 5 a 500 caracteres'},{status:400});
 try{
  const sql=getTeamWriteDb();
  const safety=await sql`SELECT current_user='antares_team_runtime' AND NOT r.rolsuper AND NOT r.rolbypassrls AS safe_role,
   EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('public.antares_correct_event_attendance(text,uuid,integer,text)')
    AND p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
    AND has_function_privilege(current_user,p.oid,'EXECUTE')
    AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      WHERE a.grantee=0 AND a.privilege_type='EXECUTE')) AS safe_function
   FROM pg_roles r WHERE r.rolname=current_user`;
  if(!safety[0]?.safe_role||!safety[0]?.safe_function)return unavailable();
  await sql`SELECT public.antares_correct_event_attendance(${ctx.user.id},${id}::uuid,${students}::integer,${reason.trim()})`;
  return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Correção não realizada. Verifique permissões e quantidade informada.'},{status:409})}
}
