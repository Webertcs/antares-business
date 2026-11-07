import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest){
 const owner=await requireOwner();
 if(!owner)return NextResponse.json({error:'Somente proprietário.'},{status:403});
 if(process.env.ANTARES_CRM_WRITES_ENABLED!=='true'||process.env.ANTARES_CRM_SECURITY_APPROVED!=='true')
  return NextResponse.json({error:'Gravações não habilitadas.'},{status:503});
 let expected:string;
 try{expected=new URL(process.env.ANTARES_APP_ORIGIN||'').origin;}
 catch{return NextResponse.json({error:'Origem não configurada.'},{status:503});}
 if(request.headers.get('origin')!==expected||request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')
  return NextResponse.json({error:'Origem não autorizada.'},{status:403});
 if(Number(request.headers.get('content-length')||0)>1000)return NextResponse.json({error:'Requisição excessiva.'},{status:413});
 try{
  const body=await request.json();
  if(typeof body.clientId!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.clientId)
   ||typeof body.until!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.until))
   return NextResponse.json({error:'Dados inválidos.'},{status:400});
  const sql=getTeamWriteDb();
  const result=await sql`SELECT public.antares_snooze_relationship_alert(
   ${owner.user.id},${body.clientId}::uuid,${body.until}::date) AS until`;
  return NextResponse.json({until:result[0]?.until},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Não foi possível adiar. Verifique se a migração 06D foi aplicada.'},{status:409});}
}
