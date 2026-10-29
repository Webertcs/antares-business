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
export async function POST() {
 return NextResponse.json({error:'Cadastros bloqueados até homologação da escrita multempresa.'},{status:503});
}
