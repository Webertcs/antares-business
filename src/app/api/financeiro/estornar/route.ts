import {NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export async function POST(request:Request){
 const owner=await requireOwner();
 if(!owner)return NextResponse.json({error:'Acesso exclusivo do proprietário.'},{status:403});
 const origin=request.headers.get('origin'),host=request.headers.get('host');
 if(!origin||!host||new URL(origin).host!==host)return NextResponse.json({error:'Origem inválida.'},{status:403});
 if(process.env.ANTARES_FINANCE_WRITES_ENABLED!=='true')return NextResponse.json({error:'Gravação bloqueada.'},{status:503});
 const secret=process.env.ANTARES_FINANCE_CAPABILITY;
 if(!secret||!/^[a-f0-9]{64}$/i.test(secret))return NextResponse.json({error:'Integração financeira incompleta.'},{status:503});
 let body;
 try{body=await request.json();}catch{return NextResponse.json({error:'Dados inválidos.'},{status:400});}
 if(typeof body.original_id!=='string'||!/^[a-f0-9-]{36}$/i.test(body.original_id)
   ||typeof body.reason!=='string'||body.reason.trim().length<8||body.reason.length>400)
 return NextResponse.json({error:'Informe lançamento e justificativa de pelo menos 8 caracteres.'},{status:400});
 try{
 const db=getTeamWriteDb();
 const result=await db`SELECT public.antares_reverse_ledger_entry(
  ${secret},${String(owner.user.id)},${owner.organizationId},${body.original_id},${body.reason.trim()}) AS id`;
 return NextResponse.json({ok:true,id:result[0]?.id},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Não foi possível estornar. Confira o extrato antes de repetir.'},{status:503});}
}
