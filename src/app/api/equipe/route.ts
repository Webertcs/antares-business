import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, getDb, isDeveloperSubject } from '@/lib/equipe/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ctx = await requireOwner();
    if (!ctx) return NextResponse.json({ error: 'Sem autorização' }, { status: 403 });
    const sql = getDb();
    const members = await sql`
      SELECT t.id, t.full_name, t.email, t.role, t.active, t.created_at, t.auth_subject,
        to_jsonb(t)->>'archived_at' AS archived_at
      FROM public.team_members t WHERE t.organization_id = ${ctx.organizationId}
        AND (t.role = 'collaborator' OR to_jsonb(t)->>'archived_at' IS NULL)
      ORDER BY t.created_at ASC
    `;
    const visible = members.map(({auth_subject, ...member}) => ({
      ...member, technical: isDeveloperSubject(String(auth_subject ?? '')),
    }));
    return NextResponse.json({ members: visible }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Falha ao carregar equipe' }, { status: 500 });
  }
}

// Importante: não criar usuários nem conceder papéis via POST arbitrário.
// Um convite deverá ser aceito com uma sessão verificada e validação de token no servidor.
export async function POST(_request: NextRequest) {
  return NextResponse.json({ error: 'Não é possível enviar convites neste momento.' }, { status: 501 });
}
