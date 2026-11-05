import {NextResponse} from 'next/server';
import {requireOwner,getDb} from '@/lib/equipe/auth';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const ctx=await requireOwner();
  if(!ctx)return NextResponse.json({error:'Apenas o proprietário pode consultar o cadastro de colaboradores.'},{status:403});
  const {id}=await params;
  if(!uuid.test(id))return NextResponse.json({error:'Evento inválido'},{status:400});
  const db=getDb();
  const events=await db`SELECT id FROM public.crm_events WHERE id=${id}::uuid AND organization_id=${ctx.organizationId}::uuid LIMIT 1`;
  if(!events.length)return NextResponse.json({error:'Evento não encontrado'},{status:404});
  const members=await db`SELECT id,full_name,email FROM public.team_members WHERE organization_id=${ctx.organizationId}::uuid AND role='collaborator' AND active=true ORDER BY full_name,id`;
  return NextResponse.json({members},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Equipe indisponível'},{status:503})}
}
