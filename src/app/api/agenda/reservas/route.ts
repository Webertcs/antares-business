import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getDb,getTeamWriteDb} from '@/lib/equipe/auth';
import {assertAgendaWriteAllowed} from '@/lib/equipe/agenda-write-guard';
export const dynamic='force-dynamic';export const runtime='nodejs';
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const owner=await requireOwner();if(!owner)return fail('Somente proprietário',403);
 try{const db=getDb();const [proposals,domes,links]=await Promise.all([
 db`SELECT p.id,p.title,c.name AS client_name, (m.operational_client_id IS NOT NULL) AS mapped FROM public.business_proposals p JOIN public.crm_clients c ON c.id=p.client_id AND c.organization_id=p.organization_id LEFT JOIN public.antares_client_links m ON m.organization_id=p.organization_id AND m.crm_client_id=p.client_id WHERE p.organization_id=${owner.organizationId} AND p.status='accepted'
 AND (p.client_accepted_at IS NOT NULL
  OR NOT EXISTS(SELECT 1 FROM public.vitrine_leads vl
   WHERE vl.organization_id=p.organization_id AND vl.converted_proposal_id=p.id)
  OR EXISTS(SELECT 1 FROM public.antares_proposal_reservations ar
   WHERE ar.organization_id=p.organization_id AND ar.proposal_id=p.id))
 ORDER BY p.created_at DESC`,
 db`SELECT d.id,d.name,d.capacity, (l.equipment_id IS NOT NULL) AS mapped FROM public.antares_domes d LEFT JOIN public.antares_dome_links l ON l.organization_id=d.organization_id AND l.antares_dome_id=d.id WHERE d.organization_id=${owner.organizationId} AND d.active ORDER BY d.name`,
 db`SELECT r.proposal_id,r.presentation_id,p.starts_at,p.ends_at,p.status,l.antares_dome_id AS dome_id,e.name AS dome_name FROM public.antares_proposal_reservations r JOIN public.presentations p ON p.id=r.presentation_id AND p.organization_id=r.organization_id LEFT JOIN public.equipment e ON e.id=p.dome_id AND e.organization_id=p.organization_id LEFT JOIN public.antares_dome_links l ON l.organization_id=p.organization_id AND l.equipment_id=p.dome_id WHERE r.organization_id=${owner.organizationId}`
 ]);return NextResponse.json({proposals,domes,links},{headers:{'Cache-Control':'private, no-store'}});}
 catch{return fail('Agenda de propostas indisponível até a migração 14E',503);}
}
export async function POST(req:NextRequest){
 const owner=await requireOwner();if(!owner)return fail('Somente proprietário',403);
 const denied=await assertAgendaWriteAllowed(req);if(denied)return denied;
 try{
 const v=await req.json(),uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
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
 const rows=await db`SELECT public.antares_book_proposal(${owner.user.id},${owner.organizationId}::uuid,
 ${v.proposalId}::uuid,${v.domeId}::uuid,${start.toISOString()}::timestamptz,${end.toISOString()}::timestamptz) AS id`;
 return NextResponse.json({id:rows[0]?.id},{status:201});
 }catch{return fail('Reserva não realizada: confira os vínculos, horários e a situação da proposta',409);}
}

/** Edição/cancelamento: fail-closed até existir a função transacional auditável no Neon. */
export async function PATCH(req:NextRequest){
 const owner=await requireOwner();if(!owner)return fail('Somente proprietário',403);
 const denied=await assertAgendaWriteAllowed(req);if(denied)return denied;
 try{
  const v=await req.json();
  const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  if(!v||!uuid.test(v.presentationId)||!['edit','cancel'].includes(v.action))return fail('Operação inválida',400);
  let domeId:string|null=null,start:string|null=null,end:string|null=null;
  if(v.action==='edit'){
   if(!uuid.test(v.domeId)||typeof v.start!=='string'||typeof v.end!=='string')return fail('Dados de edição inválidos',400);
   const a=new Date(v.start),b=new Date(v.end);
   if(!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime())||b<=a)return fail('Horários inválidos',400);
   domeId=v.domeId;start=a.toISOString();end=b.toISOString();
  }else if(v.confirm!=='CANCELAR')return fail('Confirmação de cancelamento obrigatória',400);
  const db=getTeamWriteDb();
  const safety=await db`SELECT p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
   AND has_function_privilege(current_user,p.oid,'EXECUTE')
   AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE x.grantee=0 AND x.privilege_type='EXECUTE') AS safe
   FROM pg_proc p WHERE p.oid=to_regprocedure('public.antares_change_proposal_reservation(text,uuid,uuid,text,uuid,timestamptz,timestamptz)')`;
  if(!safety[0]?.safe)return fail('Edição e cancelamento aguardam a função transacional auditável no Neon.',503);
  const result=await db`SELECT public.antares_change_proposal_reservation(
   ${owner.user.id},${owner.organizationId}::uuid,${v.presentationId}::uuid,${v.action},
   ${domeId}::uuid,${start}::timestamptz,${end}::timestamptz) AS id`;
  return NextResponse.json({ok:true,id:result[0]?.id},{headers:{'Cache-Control':'no-store'}});
 }catch{return fail('Operação não concluída: verifique conflitos, situação da reserva e permissões.',409);}
}
