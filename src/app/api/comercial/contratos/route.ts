import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:NextRequest){
 const owner=await requireOwner();if(!owner)return fail('Somente proprietário.',403);
 if(process.env.ANTARES_CONTRACT_WRITES_ENABLED!=='true')return fail('Contratos em homologação: gravações bloqueadas.',503);
 const origin=request.headers.get('origin'),host=request.headers.get('host');
 try{if(!origin||!host||new URL(origin).host!==host)return fail('Origem não autorizada.',403);}catch{return fail('Origem inválida.',403);}
 if(request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return fail('Formato inválido.',415);
 try{
 const body=await request.json();
 if(!body||typeof body!=='object'||!(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.proposalId))||
 !['written','verbal','whatsapp'].includes(body.mode)||
 typeof body.terms!=='string'||body.terms.trim().length<8||body.terms.length>4000||typeof body.confirm!=='boolean')
 return fail('Dados do contrato inválidos.',400);
 const db=getTeamWriteDb();
 const results=await db`SELECT public.antares_register_contract(${owner.user.id},
 ${owner.organizationId}::uuid,${body.proposalId}::uuid,${body.mode},${body.terms},${body.confirm}) AS id`;
 return NextResponse.json({id:results[0]?.id},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch{return fail('Contrato não registrado. Verifique proposta aprovada, duplicidade e permissões.',409);}
}
