import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, getDb } from '@/lib/equipe/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ctx = await requireOwner();
    if (!ctx) return NextResponse.json({ error: 'Sem autorização' }, { status: 403 });
    const sql = getDb();
    const members = await sql`
      SELECT id, full_name, email, role, active, created_at
      FROM public.team_members WHERE organization_id = ${ctx.organizationId}
      ORDER BY created_at ASC
    `;
    return NextResponse.json({ members }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Falha ao carregar equipe' }, { status: 500 });
  }
}

// Importante: não criar usuários nem conceder papéis via POST arbitrário.
// Um convite deverá ser aceito com uma sessão verificada e validação de token no servidor.
export async function POST(_request: NextRequest) {
  return NextResponse.json({ error: 'Convites ainda não habilitados: exige fluxo seguro de aceite' }, { status: 501 });
}
