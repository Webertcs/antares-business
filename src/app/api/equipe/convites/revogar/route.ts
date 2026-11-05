import { NextRequest, NextResponse } from 'next/server';
import { assertSensitiveWriteAllowed } from '@/lib/equipe/write-guard';
import { requireOwner, getTeamWriteDb } from '@/lib/equipe/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const denied = await assertSensitiveWriteAllowed(request);
  if (denied) return denied;
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: 'Acesso exclusivo do proprietário.' }, { status: 403 });
  if (Number(request.headers.get('content-length') || '0') > 1024)
    return NextResponse.json({ error: 'Requisição muito grande.' }, { status: 413 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || !('invitationId' in body))
      return NextResponse.json({ error: 'Informe o convite.' }, { status: 400 });
    const invitationId = (body as { invitationId: unknown }).invitationId;
    if (typeof invitationId !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(invitationId))
      return NextResponse.json({ error: 'Convite inválido.' }, { status: 400 });
    const sql = getTeamWriteDb();
    const rows = await sql`SELECT public.revoke_team_invitation(${owner.user.id}, ${invitationId}::uuid) AS revoked`;
    if (!rows[0]?.revoked) return NextResponse.json({ error: 'Convite inexistente, já utilizado ou sem permissão.' }, { status: 409 });
    return NextResponse.json({ revoked: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Falha ao revogar convite.' }, { status: 500 });
  }
}
