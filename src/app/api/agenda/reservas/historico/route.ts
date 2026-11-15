import {NextResponse} from 'next/server';
import {requireOwner,getDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 const owner=await requireOwner();
 if(!owner)return NextResponse.json({error:'Somente proprietário'},{status:403});
 try{
  const db=getDb();
  const exists=await db`SELECT to_regclass('public.antares_reservation_audit') IS NOT NULL AS ready`;
  if(!exists[0]?.ready)return NextResponse.json({ready:false,entries:[]},{headers:{'Cache-Control':'private, no-store'}});
  const entries=await db`SELECT id,presentation_id,action,old_start,new_start,old_end,new_end,old_status,new_status,changed_at,
    old_dome_id,new_dome_id FROM public.antares_reservation_audit
    WHERE organization_id=${owner.organizationId}::uuid ORDER BY changed_at DESC LIMIT 200`;
  return NextResponse.json({ready:true,entries},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Histórico indisponível até a implantação segura.'},{status:503});}
}
