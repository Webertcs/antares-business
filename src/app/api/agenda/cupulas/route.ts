import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';
import {assertAgendaWriteAllowed} from '@/lib/equipe/agenda-write-guard';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const reply=(error:string,status:number)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});

export async function POST(req:NextRequest){
 const owner=await requireOwner();
 if(!owner)return reply('Somente proprietário',403);
 const denied=await assertAgendaWriteAllowed(req);
 if(denied)return denied;
 try{
  const body=await req.json();
  if(!body||typeof body!=='object'||!uuid.test(body.domeId)||!['update','activate','deactivate','delete'].includes(body.action))
   return reply('Dados inválidos',400);
  let name:string|null=null,code:string|null=null,capacity:number|null=null;
  if(body.action==='update'){
   if(typeof body.name!=='string'||typeof body.code!=='string'||!Number.isInteger(body.capacity))
    return reply('Dados inválidos',400);
   name=body.name.trim();code=body.code.trim();capacity=body.capacity;
   if(name.length<2||name.length>100||code.length<1||code.length>30||capacity<1||capacity>500)
    return reply('Dados inválidos',400);
  }
  if(body.action==='delete'&&body.confirm!=='EXCLUIR')
   return reply('Confirmação obrigatória',400);
  const db=getTeamWriteDb();
  const result=await db`SELECT public.antares_manage_linked_dome(
   ${owner.user.id},${owner.organizationId}::uuid,${body.domeId}::uuid,
   ${body.action},${name},${code},${capacity}
  ) AS result`;
  return NextResponse.json({result:result[0]?.result},{headers:{'Cache-Control':'no-store'}});
 }catch{
  return reply('Operação recusada. Confira os vínculos, a capacidade, a situação das reservas ou a migração 49D.',409);
 }
}
