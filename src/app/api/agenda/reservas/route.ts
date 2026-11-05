import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getDb,getTeamWriteDb} from '@/lib/equipe/auth';
import {assertAgendaWriteAllowed} from '@/lib/equipe/agenda-write-guard';
export const dynamic='force-dynamic';export const runtime='nodejs';
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const owner=await requireOwner();if(!owner)return fail('Somente proprietário',403);
 try{const db=getDb();const [proposals,domes,links]=await Promise.all([
 db`SELECT p.id,p.title,c.name AS client_name, (m.operational_client_id IS NOT NULL) AS mapped FROM public.business_proposals p JOIN public.crm_clients c ON c.id=p.client_id AND c.organization_id=p.organization_id LEFT JOIN public.antares_client_links m ON m.organization_id=p.organization_id AND m.crm_client_id=p.client_id WHERE p.organization_id=${owner.organizationId} AND p.status='accepted' ORDER BY p.created_at DESC`,
 db`SELECT d.id,d.name,d.capacity, (l.equipment_id IS NOT NULL) AS mapped FROM public.antares_domes d LEFT JOIN public.antares_dome_links l ON l.organization_id=d.organization_id AND l.antares_dome_id=d.id WHERE d.organization_id=${owner.organizationId} AND d.active ORDER BY d.name`,
 db`SELECT r.proposal_id,r.presentation_id,p.starts_at,p.ends_at,p.status,e.name AS dome_name FROM public.antares_proposal_reservations r JOIN public.presentations p ON p.id=r.presentation_id AND p.organization_id=r.organization_id LEFT JOIN public.equipment e ON e.id=p.dome_id AND e.organization_id=p.organization_id WHERE r.organization_id=${owner.organizationId}`
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
 const rows=await db`SELECT public.antares_book_proposal(${owner.user.id},${owner.organizationId}::uuid,
 ${v.proposalId}::uuid,${v.domeId}::uuid,${start.toISOString()}::timestamptz,${end.toISOString()}::timestamptz) AS id`;
 return NextResponse.json({id:rows[0]?.id},{status:201});
 }catch{return fail('Reserva não realizada: confira vínculo, capacidade, conflitos e proposta',409);}
}
