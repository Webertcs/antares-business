import {NextResponse} from 'next/server';
import {requireMember,getDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  const ctx=await requireMember();
  if(!ctx)return NextResponse.json({error:'Acesso não autorizado.'},{status:403});
  const db=getDb();
  const [bookings,domes,crmEvents]=await Promise.all([
   db`SELECT p.id,p.title AS event_title,p.starts_at,p.ends_at,p.status,
      p.dome_id,COALESCE(d.name,'Sem cúpula') AS dome_name,
      l.event_id AS linked_event_id
      FROM public.presentations p
      LEFT JOIN public.antares_presentation_event_links l
        ON l.presentation_id=p.id AND l.organization_id=p.organization_id
      LEFT JOIN public.antares_dome_links dl
        ON dl.equipment_id=p.dome_id AND dl.organization_id=p.organization_id
      LEFT JOIN public.antares_domes d
        ON d.id=dl.antares_dome_id AND d.organization_id=p.organization_id
      WHERE p.organization_id=${ctx.organizationId}
      ORDER BY p.starts_at DESC LIMIT 1000`,
   db`SELECT id,name,active FROM public.antares_domes
      WHERE organization_id=${ctx.organizationId} ORDER BY name`,
   db`SELECT e.id,e.client_id,e.title AS event_title,e.event_date,e.status,e.start_time,e.end_time,e.dome_id
      FROM public.crm_events e
      WHERE e.organization_id=${ctx.organizationId}
        AND e.event_date IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.antares_presentation_event_links l
          JOIN public.presentations p ON p.id=l.presentation_id AND p.organization_id=e.organization_id
          WHERE l.event_id=e.id AND l.organization_id=e.organization_id
        )
      ORDER BY e.event_date DESC LIMIT 1000`
  ]);
  return NextResponse.json({bookings,domes,crmEvents},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Agenda indisponível. Confira a estrutura de apresentações.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}

export async function PATCH(request:Request){
 try{
  const ctx=await requireMember();
  if(!ctx)return NextResponse.json({error:'Acesso não autorizado.'},{status:403});
  const body=await request.json();
  const id=String(body.id||'');
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(!uuid.test(id))return NextResponse.json({error:'Evento inválido.'},{status:400});
  const start=body.start_time===''||body.start_time==null?null:String(body.start_time);
  const end=body.end_time===''||body.end_time==null?null:String(body.end_time);
  const time=/^([01]\d|2[0-3]):[0-5]\d$/;
  if((start&&!time.test(start))||(end&&!time.test(end))||(start&&end&&end<=start))
   return NextResponse.json({error:'Confira os horários de início e término.'},{status:400});
  const dome=body.dome_id===''||body.dome_id==null?null:String(body.dome_id);
  if(dome&&!uuid.test(dome))return NextResponse.json({error:'Cúpula inválida.'},{status:400});
  const db=getDb();
  if(dome){
   const valid=await db`SELECT id FROM public.antares_domes WHERE id=${dome} AND organization_id=${ctx.organizationId} AND active=true LIMIT 1`;
   if(!valid.length)return NextResponse.json({error:'Cúpula indisponível.'},{status:400});
  }
  const updated=await db`UPDATE public.crm_events SET start_time=${start},end_time=${end},dome_id=${dome}
   WHERE id=${id} AND organization_id=${ctx.organizationId}
   RETURNING id,start_time,end_time,dome_id`;
  if(!updated.length)return NextResponse.json({error:'Evento não encontrado.'},{status:404});
  return NextResponse.json({ok:true,event:updated[0]},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Não foi possível atualizar a apresentação.'},{status:503});}
}
