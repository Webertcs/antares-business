import {NextRequest,NextResponse} from 'next/server';
import {requireMember,requireOwner,getDb,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const unavailable=()=>NextResponse.json({error:'Não é possível encerrar este evento neste momento.'},{status:503,headers:{'Cache-Control':'no-store'}});
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
   : /^\d{4}-\d{2}-\d{2}$/.test(String(rawDate ?? '').slice(0,10))
    ? String(rawDate).slice(0,10)
    : '';
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const linked=await db`SELECT p.ends_at,p.status,b.status AS proposal_status
   FROM public.antares_presentation_event_links l
   JOIN public.presentations p ON p.id=l.presentation_id AND p.organization_id=l.organization_id
   LEFT JOIN public.antares_proposal_reservations r ON r.presentation_id=l.presentation_id AND r.organization_id=l.organization_id
   LEFT JOIN public.business_proposals b ON b.id=r.proposal_id AND b.organization_id=r.organization_id
   WHERE l.organization_id=${ctx.organizationId}::uuid AND l.event_id=${id}::uuid LIMIT 1`;
  const afterEnd=linked.length===0||
   (linked[0].status!=='cancelled'&&linked[0].status!=='canceled'&&
    Number.isFinite(new Date(String(linked[0].ends_at)).getTime())&&
    new Date(String(linked[0].ends_at)).getTime()<=Date.now());
  // Uma proposta aceita e vinculada a uma reserva permite concluir o evento,
  // sem exigir um contrato escrito ou uma segunda confirmação manual.
  const reserved=event[0].status==='reserved';
  const eligibleStatus=event[0].status==='confirmed'||
    (reserved&&linked.length>0&&linked[0].proposal_status==='accepted');
  const version=reserved&&eligibleStatus?await db`SELECT
   COALESCE(obj_description(to_regprocedure('public.antares_close_event(text,uuid,integer)')::oid),'')='ANTARES_RESERVATION_CLOSE_V2' AS ready`:null;
  const databaseReady=!reserved||!!version?.[0]?.ready;
  const checks={
   afterPresentation:afterEnd,
   owner:ctx.role==='owner',
   statusEligible:eligibleStatus,
   databaseReady,
   datePresent:!!eventDate,
   dateEligible:!!eventDate&&eventDate<=today,
   featureEnabled:process.env.ANTARES_EVENT_CLOSING_WRITES_ENABLED==='true'
  };
  const blockedReason=rows[0]?undefined:
   !checks.afterPresentation?'A apresentação ainda não terminou. Atualize a página após o horário final.':
   !checks.statusEligible?(reserved?'A reserva precisa estar vinculada a uma proposta aceita.':'Este evento precisa estar confirmado ou ter reserva aceita.'):
   !checks.databaseReady?'A conclusão de eventos reservados ainda aguarda homologação no banco.':
   !checks.datePresent||!checks.dateEligible?'A data do evento ainda não permite a conclusão.':
   !checks.featureEnabled?'A gravação da contagem ainda não está habilitada.':
   !checks.owner?'Somente o proprietário pode concluir o evento.':undefined;
  return NextResponse.json({
   status:event[0].status,
   attendance:rows[0]||null,
   canClose:Object.values(checks).every(Boolean),
   blockedReason,
   canCorrect:ctx.role==='owner' && event[0].status==='completed' && !!rows[0] && process.env.ANTARES_EVENT_ATTENDANCE_CORRECTIONS_ENABLED==='true',
   diagnostics:process.env.NODE_ENV==='development'?{checks,eventDate,today}:undefined
  },{headers:{'Cache-Control':'private, no-store'}});
 }catch{return unavailable();}
}
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(process.env.ANTARES_EVENT_CLOSING_WRITES_ENABLED!=='true')return unavailable();
 const ctx=await requireOwner();if(!ctx)return NextResponse.json({error:'Somente proprietário'},{status:403});
 const {id}=await params;if(!uuid.test(id))return NextResponse.json({error:'Evento inválido'},{status:400});
 try{
  const readDb=getDb();
  const linked=await readDb`SELECT p.ends_at,p.status FROM public.antares_presentation_event_links l
   JOIN public.presentations p ON p.id=l.presentation_id AND p.organization_id=l.organization_id
   WHERE l.organization_id=${ctx.organizationId}::uuid AND l.event_id=${id}::uuid LIMIT 1`;
  if(linked.length&&
    (linked[0].status==='cancelled'||linked[0].status==='canceled'||
     !Number.isFinite(new Date(String(linked[0].ends_at)).getTime())||
     new Date(String(linked[0].ends_at)).getTime()>Date.now()))
   return NextResponse.json({error:'A apresentação ainda não terminou ou foi cancelada.'},{status:409});
 }catch{return unavailable();}
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
 }catch(cause){
  const pg=cause as {code?:unknown;message?:unknown};
  const code=typeof pg?.code==='string'?pg.code:'unknown';
  const msg=typeof pg?.message==='string'?pg.message:'';
  // Diagnóstico técnico somente no servidor, sem credenciais nem payloads.
  console.error('[ANTARES] Falha no encerramento do evento:',{code,message:msg});
  const rules:Record<string,string>={
   'Dados de encerramento invalidos':'Quantidade inválida para conclusão.',
   'Evento reservado sem proposta aceita e reserva vinculada':'A reserva não possui uma proposta aceita e vinculada.',
   'Situacao do evento impede encerramento':'A situação atual do evento impede a conclusão.',
   'Evento sem data valida ou no futuro':'A data do evento ainda não permite a conclusão.',
   'A apresentacao nao terminou ou foi cancelada':'A apresentação ainda não terminou ou foi cancelada.',
   'Aguarde o horario de termino do evento':'Aguarde o horário de término da apresentação.',
   'Evento nao atualizado':'O evento não foi atualizado. Confira o estado atual.',
   'Evento vinculado: altere a reserva para sincronizar':'A proteção do banco ainda impede a conclusão de eventos vinculados. É necessário atualizar o gatilho de encerramento.'
  };
  const knownRule=Object.entries(rules).find(([key])=>msg.includes(key));
  const error=knownRule?.[1]||
   (code==='23505'?'Este evento já possui contagem registrada. Atualize a Central de Atendimento.':
    code==='42501'?'O banco recusou a gravação por falta de permissão (RLS ou função).':
    code==='23503'?'O banco recusou o vínculo da contagem com este evento.':
    code==='23514'?'Uma regra de integridade do banco impediu a gravação.':
    code==='42P01'||code==='42703'?'A estrutura de registro de alunos ainda não está compatível com o banco.':
    code==='42883'?'A função de conclusão ainda não está disponível no banco.':
    code==='P0002'?'Evento ou proprietário não encontrado no banco.':
    msg.includes('DATABASE_URL_TEAM_RUNTIME')?'Conexão operacional de gravação não configurada.':
    'O banco recusou o encerramento. Confira no terminal o diagnóstico técnico.');
  return NextResponse.json({error,diagnostic:code},{status:code==='42501'?503:409,headers:{'Cache-Control':'no-store'}});
 }
}
