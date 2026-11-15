import {NextResponse} from 'next/server';
import {requireMember,getDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const ctx=await requireMember();
  if(!ctx)return NextResponse.json({error:'Acesso não autorizado.'},{status:403});
  const {id}=await params;
  if(!uuid.test(id))return NextResponse.json({error:'Evento inválido.'},{status:400});
  const db=getDb();
  const exists=await db`SELECT id FROM public.crm_events WHERE id=${id} AND organization_id=${ctx.organizationId} LIMIT 1`;
  if(!exists.length)return NextResponse.json({error:'Evento não encontrado.'},{status:404});
  const [operations,checklist,sessions]=await Promise.all([
   db`SELECT access_instructions,parking_instructions,power_requirements,setup_notes,updated_at
      FROM public.antares_event_operations WHERE event_id=${id} AND organization_id=${ctx.organizationId} LIMIT 1`,
   db`SELECT id,label,done,completed_at FROM public.antares_event_checklist
      WHERE event_id=${id} AND organization_id=${ctx.organizationId} ORDER BY created_at,id LIMIT 100`,
   db`SELECT id,label,starts_at,ends_at,expected_students FROM public.antares_event_sessions
      WHERE event_id=${id} AND organization_id=${ctx.organizationId} ORDER BY starts_at NULLS LAST,created_at,id LIMIT 100`
  ]);
  return NextResponse.json({available:true,canEdit:ctx.role==='owner' && process.env.ANTARES_EVENT_OPERATIONS_WRITES_ENABLED==='true',operations:operations[0]||null,checklist,sessions},{headers:{'Cache-Control':'private, no-store'}});
 }catch{
  return NextResponse.json({available:false,error:'Operação ainda não implantada ou indisponível.'},{status:503,headers:{'Cache-Control':'private, no-store'}});
 }
}
