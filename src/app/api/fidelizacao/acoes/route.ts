import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getDb,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 const ctx=await requireOwner();if(!ctx)return NextResponse.json({error:'Somente proprietário.'},{status:403});
 try{
  const db=getDb();
  const actions=await db`SELECT a.id,a.client_id,a.action_kind,a.due_date,a.priority,a.status,a.note,a.created_at,a.completed_at,c.name AS client_name
  FROM public.antares_relationship_actions a
  JOIN public.crm_clients c ON c.id=a.client_id AND c.organization_id=a.organization_id
  WHERE a.organization_id=${ctx.organizationId}
  ORDER BY CASE WHEN a.status='open' THEN 0 ELSE 1 END,a.due_date ASC NULLS LAST,a.created_at DESC LIMIT 300`;
  return NextResponse.json({actions},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Não foi possível carregar a agenda.'},{status:503});}
}
export async function POST(request:NextRequest){
 const ctx=await requireOwner();if(!ctx)return NextResponse.json({error:'Somente proprietário.'},{status:403});
 if(process.env.ANTARES_CRM_WRITES_ENABLED!=='true'||process.env.ANTARES_CRM_SECURITY_APPROVED!=='true')
 return NextResponse.json({error:'Gravações ainda não homologadas.'},{status:503});
 if(request.headers.get('origin')!==new URL(process.env.ANTARES_APP_ORIGIN||'http://localhost:3000').origin||
 request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')
 return NextResponse.json({error:'Origem não autorizada.'},{status:403});
 if(Number(request.headers.get('content-length')||0)>5000)return NextResponse.json({error:'Requisição muito grande.'},{status:413});
 try{
  const b=await request.json();
  const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v)?v:null;
  const cmd=b.command;
  if(!['create','complete','dismiss'].includes(cmd)|| (cmd==='create'&&!uuid(b.clientId))||(cmd!=='create'&&!uuid(b.id)))
  return NextResponse.json({error:'Parâmetros inválidos.'},{status:400});
  const date=typeof b.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(b.date)?b.date:null;
  const kind=typeof b.kind==='string'?b.kind:'follow_up';
  const priority=typeof b.priority==='string'?b.priority:'normal';
  const note=typeof b.note==='string'?b.note:'';
  if(!['follow_up','renewal','feedback','offer','other'].includes(kind)||!['low','normal','high'].includes(priority)||note.length>2000)
  return NextResponse.json({error:'Dados inválidos.'},{status:400});
  const sql=getTeamWriteDb();
  const rows=await sql`SELECT public.antares_manage_relationship_action(
  ${ctx.user.id},${uuid(b.clientId)}::uuid,${uuid(b.id)}::uuid,${kind},${date}::date,${priority},${note},${cmd}) AS id`;
  return NextResponse.json({id:rows[0]?.id});
 }catch{return NextResponse.json({error:'Não foi possível registrar a ação. Confira a migração 06C.'},{status:409});}
}
