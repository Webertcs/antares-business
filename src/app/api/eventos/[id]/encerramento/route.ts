import {NextRequest,NextResponse} from 'next/server';
import {requireMember,requireOwner,getDb,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const unavailable=()=>NextResponse.json({error:'Encerramento aguardando implantação e homologação da função protegida no Neon.'},{status:503,headers:{'Cache-Control':'no-store'}});
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const ctx=await requireMember();if(!ctx)return NextResponse.json({error:'Acesso negado'},{status:403});
 const {id}=await params;if(!uuid.test(id))return NextResponse.json({error:'Evento inválido'},{status:400});
 try{
  const db=getDb();
  const event=await db`SELECT id,status,event_date,client_id FROM public.crm_events WHERE id=${id}::uuid AND organization_id=${ctx.organizationId}::uuid LIMIT 1`;
  if(!event.length)return NextResponse.json({error:'Evento não encontrado'},{status:404});
  const present=await db`SELECT to_regclass('public.antares_event_attendance') IS NOT NULL AS ready`;
  if(!present[0]?.ready)return NextResponse.json({status:event[0].status,attendance:null,canClose:false},{headers:{'Cache-Control':'private, no-store'}});
  const rows=await db`SELECT actual_students,closed_at FROM public.antares_event_attendance WHERE organization_id=${ctx.organizationId}::uuid AND event_id=${id}::uuid LIMIT 1`;
  const rawDate = event[0].event_date;
  const eventDate = rawDate instanceof Date
   ? new Intl.DateTimeFormat('en-CA',{timeZone:'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(rawDate)
   : /^\\d{4}-\\d{2}-\\d{2}$/.test(String(rawDate ?? '').slice(0,10))
    ? String(rawDate).slice(0,10)
    : '';
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const checks = {
   owner:ctx.role==='owner',
   confirmed:event[0].status==='confirmed',
   datePresent:!!eventDate,
   dateEligible:!!eventDate && eventDate<=today,
   featureEnabled:process.env.ANTARES_EVENT_CLOSING_WRITES_ENABLED==='true'
  };
  return NextResponse.json({
   status:event[0].status,
   attendance:rows[0]||null,
   canClose:Object.values(checks).every(Boolean),
   diagnostics:process.env.NODE_ENV==='development'?{checks,eventDate,today}:undefined
  },{headers:{'Cache-Control':'private, no-store'}});
 }catch{return unavailable();}
}
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(process.env.ANTARES_EVENT_CLOSING_WRITES_ENABLED!=='true')return unavailable();
 const ctx=await requireOwner();if(!ctx)return NextResponse.json({error:'Somente proprietário'},{status:403});
 const {id}=await params;if(!uuid.test(id))return NextResponse.json({error:'Evento inválido'},{status:400});
 let origin='';try{origin=new URL(process.env.ANTARES_APP_ORIGIN||'').origin}catch{return unavailable()}
 if(req.headers.get('origin')!==origin||req.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()!=='application/json')
  return NextResponse.json({error:'Origem ou conteúdo inválido'},{status:403});
 if(Number(req.headers.get('content-length')||'0')>2000)return NextResponse.json({error:'Requisição excessiva'},{status:413});
 let body:unknown;try{body=await req.json()}catch{return NextResponse.json({error:'JSON inválido'},{status:400})}
 const students=(body as {students?:unknown})?.students;
 if(typeof students!=='number'||!Number.isInteger(students)||students<0||students>100000)
  return NextResponse.json({error:'Informe um total válido de alunos atendidos'},{status:400});
 try{
  const sql=getTeamWriteDb();
  const safety=await sql`SELECT current_user='antares_team_runtime' AND NOT r.rolsuper AND NOT r.rolbypassrls AS safe_role,
   EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('public.antares_close_event(text,uuid,integer)')
    AND p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
    AND has_function_privilege(current_user,p.oid,'EXECUTE')
    AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      WHERE a.grantee=0 AND a.privilege_type='EXECUTE')) AS safe_function
   FROM pg_roles r WHERE r.rolname=current_user`;
  if(!safety[0]?.safe_role||!safety[0]?.safe_function)return unavailable();
  await sql`SELECT public.antares_close_event(${ctx.user.id},${id}::uuid,${students}::integer)`;
  return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Encerramento não realizado. Confira permissões, situação e data do evento.'},{status:409})}
}
