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
      p.dome_id,COALESCE(d.name,'Sem cúpula') AS dome_name
      FROM public.presentations p
      LEFT JOIN public.antares_dome_links dl
        ON dl.equipment_id=p.dome_id AND dl.organization_id=p.organization_id
      LEFT JOIN public.antares_domes d
        ON d.id=dl.antares_dome_id AND d.organization_id=p.organization_id
      WHERE p.organization_id=${ctx.organizationId}
      ORDER BY p.starts_at DESC LIMIT 1000`,
   db`SELECT id,name,active FROM public.antares_domes
      WHERE organization_id=${ctx.organizationId} ORDER BY name`,
   db`SELECT id,title AS event_title,event_date,status FROM public.crm_events WHERE organization_id=${ctx.organizationId} AND event_date IS NOT NULL ORDER BY event_date DESC LIMIT 1000`
  ]);
  return NextResponse.json({bookings,domes,crmEvents},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Agenda indisponível. Confira a estrutura de apresentações.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
