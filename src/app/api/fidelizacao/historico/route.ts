import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest){
 const ctx=await requireOwner();
 if(!ctx)return NextResponse.json({error:'Somente proprietário.'},{status:403});
 if(process.env.ANTARES_CRM_WRITES_ENABLED!=='true'||process.env.ANTARES_CRM_SECURITY_APPROVED!=='true')
  return NextResponse.json({error:'Gravações ainda não homologadas.'},{status:503});
 if(request.headers.get('origin')!==new URL(process.env.ANTARES_APP_ORIGIN||'http://localhost:3000').origin||
 request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')
  return NextResponse.json({error:'Origem não autorizada.'},{status:403});
 if(Number(request.headers.get('content-length')||0)>2000)return NextResponse.json({error:'Requisição muito grande.'},{status:413});
 try{
  const b=await request.json();
  if(typeof b.id!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(b.id)||!['archive','restore'].includes(b.command))
   return NextResponse.json({error:'Parâmetros inválidos.'},{status:400});
  const sql=getTeamWriteDb();
  const rows=await sql`SELECT public.antares_manage_relationship_history(${ctx.user.id},${b.id}::uuid,${b.command}) AS id`;
  return NextResponse.json({id:rows[0]?.id},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Não foi possível alterar o histórico. Confira a migração 06E.'},{status:409});}
}
