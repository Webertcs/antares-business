import {NextResponse} from 'next/server';
import {requireOwner,getDb} from '@/lib/equipe/auth';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(){
 try{
  const owner=await requireOwner();
  if(!owner)return NextResponse.json({error:'Acesso não autorizado.'},{status:403});
  const db=getDb();
  const domes=await db`SELECT d.id,d.name,d.code,d.capacity,d.active,
    EXISTS(SELECT 1 FROM public.antares_dome_links l
     WHERE l.organization_id=d.organization_id AND l.antares_dome_id=d.id) AS mapped
    FROM public.antares_domes d WHERE d.organization_id=${owner.organizationId}
    ORDER BY d.active DESC,d.name ASC`;
  return NextResponse.json({domes,writesEnabled:process.env.ANTARES_AGENDA_WRITES_ENABLED==='true'});
 }catch{
  return NextResponse.json({error:'Não foi possível consultar as cúpulas.'},{status:500});
 }
}
