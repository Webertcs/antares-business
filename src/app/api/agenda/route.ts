import {NextResponse} from 'next/server';
import {requireMember,requireOwner,getDb,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  const ctx=await requireMember();
  if(!ctx)return NextResponse.json({error:'Acesso não autorizado.'},{status:403});
  const db=getDb();
  const [bookings,domes,crmEvents]=await Promise.all([
   db`SELECT p.id,p.title AS event_title,p.starts_at,p.ends_at,p.status,
      p.dome_id,COALESCE(d.name,'Sem cúpula') AS dome_name,
      l.event_id AS linked_event_id
      FROM public.presentations p
      LEFT JOIN public.antares_presentation_event_links l
        ON l.presentation_id=p.id AND l.organization_id=p.organization_id
      LEFT JOIN public.antares_dome_links dl
        ON dl.equipment_id=p.dome_id AND dl.organization_id=p.organization_id
      LEFT JOIN public.antares_domes d
        ON d.id=dl.antares_dome_id AND d.organization_id=p.organization_id
      WHERE p.organization_id=${ctx.organizationId}
      ORDER BY p.starts_at DESC LIMIT 1000`,
   db`SELECT id,name,active FROM public.antares_domes
      WHERE organization_id=${ctx.organizationId} ORDER BY name`,
   db`SELECT e.id,e.client_id,e.title AS event_title,e.event_date,e.status,e.start_time,e.end_time,e.dome_id
      FROM public.crm_events e
      WHERE e.organization_id=${ctx.organizationId}
        AND e.event_date IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.antares_presentation_event_links l
          JOIN public.presentations p ON p.id=l.presentation_id AND p.organization_id=e.organization_id
          WHERE l.event_id=e.id AND l.organization_id=e.organization_id
        )
      ORDER BY e.event_date DESC LIMIT 1000`
  ]);
  return NextResponse.json({bookings,domes,crmEvents},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Agenda indisponível. Confira a estrutura de apresentações.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}

export async function PATCH(request:Request){
 const ctx=await requireOwner();
 if(!ctx)return NextResponse.json({error:'Somente proprietário.'},{status:403});
 let allowed='';
 try{allowed=new URL(process.env.ANTARES_APP_ORIGIN||'').origin;}catch{
  return NextResponse.json({error:'Origem não configurada.'},{status:503});
 }
 if(request.headers.get('origin')!==allowed)return NextResponse.json({error:'Origem não autorizada.'},{status:403});
 if(request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()!=='application/json')
  return NextResponse.json({error:'Formato inválido.'},{status:415});
 if(Number(request.headers.get('content-length')||0)>2500)
  return NextResponse.json({error:'Requisição excessiva.'},{status:413});
 try{
  const raw=await request.text();
  if(raw.length>2500)return NextResponse.json({error:'Requisição excessiva.'},{status:413});
  const body=JSON.parse(raw) as Record<string,unknown>;
  if(!body||typeof body!=='object'||Array.isArray(body))return NextResponse.json({error:'Dados inválidos.'},{status:400});
  const id=String(body.id||'');
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(!uuid.test(id))return NextResponse.json({error:'Evento inválido.'},{status:400});
  const start=body.start_time===''||body.start_time==null?null:String(body.start_time);
  const end=body.end_time===''||body.end_time==null?null:String(body.end_time);
  const time=/^([01]\d|2[0-3]):[0-5]\d$/;
  if((start&&!time.test(start))||(end&&!time.test(end))||(start&&end&&end<=start))
   return NextResponse.json({error:'Confira os horários de início e término.'},{status:400});
  const dome=body.dome_id===''||body.dome_id==null?null:String(body.dome_id);
  if(dome&&!uuid.test(dome))return NextResponse.json({error:'Cúpula inválida.'},{status:400});
  // A agenda nunca grava pela conexão geral de leitura.
  if(process.env.ANTARES_AGENDA_WRITES_ENABLED!=='true' ||
     process.env.ANTARES_DB_RUNTIME_ROLE!=='antares_team_runtime' ||
     !process.env.DATABASE_URL_TEAM_RUNTIME)
    return NextResponse.json({error:'Alterações da agenda aguardando homologação.'},{status:503});
  const db=getTeamWriteDb();
  const checks=await db`SELECT
    current_user='antares_team_runtime'
    AND r.rolcanlogin AND NOT r.rolsuper AND NOT r.rolbypassrls
    AND NOT has_table_privilege(current_user,'public.crm_events','UPDATE')
    AND p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
    AND has_function_privilege(current_user,p.oid,'EXECUTE')
    AND NOT EXISTS (
      SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
      WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
    ) AS ok
    FROM pg_roles r JOIN pg_proc p
      ON p.oid=to_regprocedure('public.antares_update_unlinked_event_schedule(text,uuid,uuid,text,text,uuid)')
    WHERE r.rolname=current_user`;
  if(checks[0]?.ok!==true)
    return NextResponse.json({error:'Gravação restrita da agenda ainda não homologada.'},{status:503});
  const rows=await db`SELECT public.antares_update_unlinked_event_schedule(
    ${ctx.user.id},${ctx.organizationId}::uuid,${id}::uuid,${start},${end},${dome}::uuid
  ) AS result`;
  const result=rows[0]?.result as {status?:string; event?:unknown}|null|undefined;
  if(result?.status==='linked')return NextResponse.json(
    {error:'Esta apresentação possui reserva vinculada. Reagende pelo botão Ver reserva para manter a cúpula sincronizada.'},
    {status:409,headers:{'Cache-Control':'no-store'}});
  if(result?.status==='dome')return NextResponse.json({error:'Cúpula indisponível.'},{status:400});
  if(result?.status==='missing')return NextResponse.json({error:'Evento não encontrado.'},{status:404});
  if(result?.status!=='ok'||!result.event)
    return NextResponse.json({error:'Agenda não homologada.'},{status:503});
  return NextResponse.json({ok:true,event:result.event},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Não foi possível atualizar a apresentação.'},{status:503});}
}
