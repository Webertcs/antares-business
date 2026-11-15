import {NextResponse} from 'next/server';
import {requireOwner,getDb} from '@/lib/equipe/auth';

export const dynamic='force-dynamic';
export const runtime='nodejs';

export async function GET(){
 try{
  const owner=await requireOwner();
  if(!owner)return NextResponse.json({error:'Acesso não autorizado.'},{status:403});
  const db=getDb();
  const entries=await db`SELECT id,action,entity_type,entity_id,created_at
    FROM public.business_audit WHERE organization_id=${owner.organizationId}
    ORDER BY created_at DESC LIMIT 100`;
  return NextResponse.json({entries});
 }catch{
  return NextResponse.json({error:'Histórico indisponível no momento.'},{status:500});
 }
}
