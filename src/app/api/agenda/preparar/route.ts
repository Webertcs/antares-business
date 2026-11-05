import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';
import {assertAgendaWriteAllowed} from '@/lib/equipe/agenda-write-guard';
export const dynamic='force-dynamic';export const runtime='nodejs';
const fail=(error:string,status:number)=>NextResponse.json({error},{status});
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export async function POST(request:NextRequest){
 const owner=await requireOwner();if(!owner)return fail('Somente proprietário',403);
 const denied=await assertAgendaWriteAllowed(request);if(denied)return denied;
 try{
 const v=await request.json(),db=getTeamWriteDb();
 if(v?.action==='link-client'&&typeof v.proposalId==='string'&&uuid.test(v.proposalId)){
 const result=await db`SELECT public.antares_prepare_proposal_client(${owner.user.id},${owner.organizationId}::uuid,${v.proposalId}::uuid) AS id`;
 return NextResponse.json({id:result[0]?.id});}
 if(v?.action==='create-dome'&&typeof v.name==='string'&&v.name.trim().length>=2&&v.name.length<=100&&
 typeof v.code==='string'&&v.code.trim().length>=1&&v.code.length<=30&&Number.isInteger(v.capacity)&&v.capacity>=1&&v.capacity<=500){
 const result=await db`SELECT public.antares_create_linked_dome(${owner.user.id},${owner.organizationId}::uuid,${v.name},${v.code},${v.capacity}) AS id`;
 return NextResponse.json({id:result[0]?.id});}
 return fail('Dados inválidos',400);
 }catch{return fail('Operação recusada: confira duplicidades, permissões e migrações',409);}
}
