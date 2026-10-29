import { NextResponse } from 'next/server';
import { requireMember, getDb } from '@/lib/equipe/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const ctx = await requireMember();
    if (!ctx) return NextResponse.json({ error: 'Acesso não autorizado.' }, {status:403});
    const db = getDb();
    const [clients, contacts, events] = await Promise.all([
      db`SELECT id, kind, name, email, phone, city, status, notes, created_at
        FROM public.crm_clients WHERE organization_id=${ctx.organizationId}
        ORDER BY created_at DESC LIMIT 500`,
      db`SELECT id,client_id,full_name,position,email,phone,whatsapp,is_primary
        FROM public.crm_contacts WHERE organization_id=${ctx.organizationId}
        ORDER BY is_primary DESC,created_at DESC LIMIT 1000`,
      db`SELECT id,client_id,title,event_kind,event_date,expected_attendees,pricing_model,
               price_per_person,fixed_amount,status,venue,notes
        FROM public.crm_events WHERE organization_id=${ctx.organizationId}
        ORDER BY event_date DESC NULLS LAST LIMIT 500`
    ]);
    return NextResponse.json({ clients,contacts,events },{headers:{'Cache-Control':'no-store'}});
  } catch {
    return NextResponse.json({ error:'Módulo CRM ainda não implantado no banco. Execute a migração 03 após backup.' },
      {status:503,headers:{'Cache-Control':'no-store'}});
  }
}
export async function POST(request: import('next/server').NextRequest) {
  // Habilitar separadamente dos convites do Bloco 02, após homologação.
  if (process.env.ANTARES_CRM_WRITES_ENABLED !== 'true' ||
      process.env.ANTARES_CRM_SECURITY_APPROVED !== 'true')
    return NextResponse.json({ error: 'Cadastro ainda em homologação.' }, {status:503});
  const origin = process.env.ANTARES_APP_ORIGIN;
  let expectedOrigin: string;
  try { expectedOrigin = new URL(origin || '').origin; }
  catch { return NextResponse.json({error:'Origem da aplicação não configurada.'},{status:503}); }
  if (request.headers.get('origin') !== expectedOrigin ||
      request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json')
    return NextResponse.json({error:'Origem ou conteúdo não autorizado.'},{status:403});
  if (Number(request.headers.get('content-length')||'0') > 10000)
    return NextResponse.json({error:'Requisição grande demais.'},{status:413});
  const ctx = await requireMember();
  if (!ctx || ctx.role!=='owner') return NextResponse.json({error:'Somente proprietário.'},{status:403});
  try {
    const { getTeamWriteDb } = await import('@/lib/equipe/auth');
    const sql = getTeamWriteDb();
    const safety = await sql`SELECT
      current_user = 'antares_team_runtime' AND
      r.rolcanlogin AND NOT r.rolsuper AND NOT r.rolbypassrls AS safe_role,
      (SELECT count(*) = 3 FROM pg_class c
        WHERE c.oid IN ('public.crm_clients'::regclass,
          'public.crm_contacts'::regclass,'public.crm_events'::regclass)
          AND c.relrowsecurity
          AND NOT has_table_privilege(current_user,c.oid,'SELECT')
          AND NOT has_table_privilege(current_user,c.oid,'INSERT')
          AND NOT has_table_privilege(current_user,c.oid,'UPDATE')
          AND NOT has_table_privilege(current_user,c.oid,'DELETE')) AS safe_tables,
      (SELECT count(*) = 3 FROM pg_proc p
        WHERE p.pronamespace='public'::regnamespace
          AND p.proname IN ('crm_save_client','crm_save_contact','crm_save_event')
          AND p.prosecdef
          AND pg_get_userbyid(p.proowner)='neondb_owner'
          AND has_function_privilege(current_user,p.oid,'EXECUTE')
          AND NOT EXISTS (
            SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
            WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
          )) AS safe_functions
      FROM pg_roles r WHERE r.rolname=current_user`;
    if (!safety[0]?.safe_role || !safety[0]?.safe_tables || !safety[0]?.safe_functions)
      return NextResponse.json({error:'Isolamento do CRM não verificado.'},{status:503});
    const body = await request.json();
    const str=(v:unknown,max=4000)=>typeof v==='string'?v.trim().slice(0,max):'';
    const uuid=(v:unknown)=>typeof v==='string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v)?v:null;
    if (body.action==='client') {
      const rows=await sql`SELECT public.crm_save_client(
        ${ctx.user.id},${uuid(body.id)}::uuid,${str(body.kind,30)},${str(body.name,180)},
        ${str(body.email,254)},${str(body.phone,40)},${str(body.city,120)},
        ${str(body.notes)},${str(body.status,30)}) AS id`;
      return NextResponse.json({id:rows[0]?.id},{status:201});
    }
    if(body.action==='contact' && uuid(body.clientId)){
      const rows=await sql`SELECT public.crm_save_contact(
        ${ctx.user.id},${uuid(body.clientId)}::uuid,${str(body.name,160)},
        ${str(body.position,120)},${str(body.email,254)},${str(body.phone,40)},
        ${body.whatsapp===true},${body.primary===true}) AS id`;
      return NextResponse.json({id:rows[0]?.id},{status:201});
    }
    if(body.action==='event' && uuid(body.clientId)){
      const date=str(body.date,10);
      if(date && !/^\d{4}-\d{2}-\d{2}$/.test(date))
        return NextResponse.json({error:'Data inválida.'},{status:400});
      const participants=body.attendees===null||body.attendees===''?null:Number(body.attendees);
      const price=body.price===null||body.price===''?null:Number(body.price);
      const fixed=body.fixed===null||body.fixed===''?null:Number(body.fixed);
      if([participants,price,fixed].some(v=>v!==null&&!Number.isFinite(v)))
        return NextResponse.json({error:'Valores inválidos.'},{status:400});
      const rows=await sql`SELECT public.crm_save_event(
        ${ctx.user.id},${uuid(body.clientId)}::uuid,${str(body.title,180)},${str(body.kind,30)},
        ${date||null}::date,${participants},${str(body.pricing,30)},
        ${price},${fixed},${str(body.status,30)},${str(body.venue,200)},${str(body.notes)}) AS id`;
      return NextResponse.json({id:rows[0]?.id},{status:201});
    }
    return NextResponse.json({error:'Operação inválida.'},{status:400});
  } catch {
    return NextResponse.json({error:'Operação não realizada. Confira dados e permissões.'},{status:409});
  }
}
