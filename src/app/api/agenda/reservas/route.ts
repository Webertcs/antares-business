import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getDb,getTeamWriteDb} from '@/lib/equipe/auth';
import {assertAgendaWriteAllowed} from '@/lib/equipe/agenda-write-guard';
export const dynamic='force-dynamic';export const runtime='nodejs';
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const owner=await requireOwner();if(!owner)return fail('Somente proprietário',403);
 try{const db=getDb();const [proposals,domes,links]=await Promise.all([
 db`SELECT p.id,p.title,p.expected_attendees,c.name AS client_name, (m.operational_client_id IS NOT NULL) AS mapped FROM public.business_proposals p JOIN public.crm_clients c ON c.id=p.client_id AND c.organization_id=p.organization_id LEFT JOIN public.antares_client_links m ON m.organization_id=p.organization_id AND m.crm_client_id=p.client_id WHERE p.organization_id=${owner.organizationId} AND p.status='accepted'
 AND (p.client_accepted_at IS NOT NULL
  OR NOT EXISTS(SELECT 1 FROM public.vitrine_leads vl
   WHERE vl.organization_id=p.organization_id AND vl.converted_proposal_id=p.id)
  OR EXISTS(SELECT 1 FROM public.antares_proposal_reservations ar
   WHERE ar.organization_id=p.organization_id AND ar.proposal_id=p.id))
 ORDER BY p.created_at DESC`,
 db`SELECT d.id,d.name,d.capacity, (l.equipment_id IS NOT NULL) AS mapped FROM public.antares_domes d LEFT JOIN public.antares_dome_links l ON l.organization_id=d.organization_id AND l.antares_dome_id=d.id WHERE d.organization_id=${owner.organizationId} AND d.active ORDER BY d.name`,
 db`SELECT r.proposal_id,r.presentation_id,p.starts_at,p.ends_at,p.status,l.antares_dome_id AS dome_id,e.name AS dome_name, pel.event_id AS crm_event_id,ce.status AS crm_event_status FROM public.antares_proposal_reservations r JOIN public.presentations p ON p.id=r.presentation_id AND p.organization_id=r.organization_id LEFT JOIN public.equipment e ON e.id=p.dome_id AND e.organization_id=p.organization_id LEFT JOIN public.antares_dome_links l ON l.organization_id=p.organization_id AND l.equipment_id=p.dome_id LEFT JOIN public.antares_presentation_event_links pel ON pel.organization_id=r.organization_id AND pel.presentation_id=r.presentation_id LEFT JOIN public.crm_events ce ON ce.organization_id=pel.organization_id AND ce.id=pel.event_id WHERE r.organization_id=${owner.organizationId}`
 ]);
 let history:unknown[]=[];
 try{
  const exists=await db`SELECT to_regclass('public.antares_reservation_changes') IS NOT NULL AS ready`;
  if(exists[0]?.ready){
   const read=getTeamWriteDb();
   history=await read`SELECT * FROM public.antares_reservation_history(${owner.user.id},${owner.organizationId}::uuid)`;
  }
 }catch{history=[];}
 return NextResponse.json({proposals,domes,links,history},{headers:{'Cache-Control':'private, no-store'}});
}
 catch{return fail('Agenda de propostas indisponível até a migração 14E',503);}
}
export async function POST(req:NextRequest){
 const owner=await requireOwner();if(!owner)return fail('Somente proprietário',403);
 const denied=await assertAgendaWriteAllowed(req);if(denied)return denied;
 if(Number(req.headers.get('content-length')||0)>2500)return fail('Requisição excessiva.',413);
 try{
 const raw=await req.text();if(raw.length>2500)return fail('Requisição excessiva.',413);
 const v=JSON.parse(raw),uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
 if(!v||!uuid.test(v.proposalId)||!uuid.test(v.domeId)||typeof v.start!=='string'||typeof v.end!=='string')return fail('Dados inválidos',400);
 const start=new Date(v.start),end=new Date(v.end);
 if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)return fail('Horários inválidos',400);
 const db=getTeamWriteDb();
 // Verificação antecipada para evitar conflito comum; a proteção definitiva
 // contra gravações simultâneas deve ocorrer atomicamente no banco.
 const readDb=getDb();
 const conflicts=await readDb`SELECT p.id FROM public.antares_dome_links l
 JOIN public.presentations p ON p.organization_id=l.organization_id AND p.dome_id=l.equipment_id
 WHERE l.organization_id=${owner.organizationId}::uuid AND l.antares_dome_id=${v.domeId}::uuid
 AND p.status NOT IN ('cancelled') AND p.starts_at<${end.toISOString()}::timestamptz
 AND p.ends_at>${start.toISOString()}::timestamptz LIMIT 1`;
 if(conflicts.length)return fail('Esta cúpula já possui apresentação no período selecionado. Escolha outro horário ou cúpula.',409);
 const safe=await db`SELECT p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
   AND has_function_privilege(current_user,p.oid,'EXECUTE')
   AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE x.grantee=0 AND x.privilege_type='EXECUTE') AS ok
   FROM pg_proc p WHERE p.oid=to_regprocedure('public.antares_book_ready_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)')`;
 if(!safe[0]?.ok)return fail('Integração da reserva e do evento aguardando homologação no Neon.',503);
 const rows=await db`SELECT public.antares_book_ready_proposal(${owner.user.id},${owner.organizationId}::uuid,
 ${v.proposalId}::uuid,${v.domeId}::uuid,${start.toISOString()}::timestamptz,${end.toISOString()}::timestamptz) AS id`;
 return NextResponse.json({id:rows[0]?.id},{status:201});
 }catch{return fail('Reserva não realizada: confira os vínculos, horários e a situação da proposta',409);}
}

/** Reagendamento e cancelamento: transação no banco, sem apagar histórico ou financeiro. */
export async function PATCH(req:NextRequest){
 const owner=await requireOwner();if(!owner)return fail('Somente proprietário',403);
 const denied=await assertAgendaWriteAllowed(req);if(denied)return denied;
 if(Number(req.headers.get('content-length')||0)>2500)return fail('Requisição grande demais.',413);
 try{
  const raw=await req.text();if(raw.length>2500)return fail('Requisição grande demais.',413);
  const v=JSON.parse(raw) as Record<string,unknown>;
  const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  if(!v||typeof v.presentationId!=='string'||!uuid.test(v.presentationId)||!['edit','cancel'].includes(String(v.action)))
   return fail('Operação inválida.',400);
  const reason=typeof v.reason==='string'?v.reason.trim():'';
  if(reason.length<5||reason.length>500)return fail('Informe o motivo (5 a 500 caracteres).',400);
  let domeId:string|null=null,start:string|null=null,end:string|null=null;
  if(v.action==='edit'){
   if(typeof v.domeId!=='string'||!uuid.test(v.domeId)||typeof v.start!=='string'||typeof v.end!=='string')
    return fail('Dados de reagendamento inválidos.',400);
   const a=new Date(v.start),b=new Date(v.end);
   if(!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime())||b<=a||a<=new Date())
    return fail('Escolha uma nova data futura e um período válido.',400);
   domeId=v.domeId;start=a.toISOString();end=b.toISOString();
  }else if(v.confirm!=='CANCELAR')return fail('Confirmação de cancelamento obrigatória.',400);
  const db=getTeamWriteDb();
  const safe=await db`SELECT current_user='antares_team_runtime' AND NOT r.rolsuper AND NOT r.rolbypassrls AS role_ok,
    p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
    AND has_function_privilege(current_user,p.oid,'EXECUTE')
    AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x
      WHERE x.grantee=0 AND x.privilege_type='EXECUTE') AS function_ok
    FROM pg_roles r CROSS JOIN pg_proc p WHERE r.rolname=current_user
    AND p.oid=to_regprocedure('public.antares_manage_proposal_reservation(text,uuid,uuid,text,uuid,timestamptz,timestamptz,text)')`;
  if(!safe[0]?.role_ok||!safe[0]?.function_ok)return fail('Alterações de reservas aguardam homologação no Neon.',503);
  const result=await db`SELECT public.antares_manage_proposal_reservation(
    ${owner.user.id},${owner.organizationId}::uuid,${v.presentationId}::uuid,${v.action},
    ${domeId}::uuid,${start}::timestamptz,${end}::timestamptz,${reason}) AS id`;
  return NextResponse.json({ok:true,id:result[0]?.id},{headers:{'Cache-Control':'no-store'}});
 }catch{return fail('Não foi possível alterar a reserva. Verifique os vínculos, a data e as permissões.',409);}
}
