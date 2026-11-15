import { assertSensitiveWriteAllowed } from '@/lib/equipe/write-guard';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'node:crypto';
import { requireOwner, getTeamWriteDb, getDb } from '@/lib/equipe/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const denied = await assertSensitiveWriteAllowed(request);
  if (denied) return denied;
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: 'Acesso exclusivo do proprietário' }, { status: 403 });
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > 4096) return NextResponse.json({ error: 'Requisição muito grande' }, { status: 413 });
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || name.length < 2 || name.length > 160)
      return NextResponse.json({ error: 'Informe nome e e-mail válidos' }, { status: 400 });
    const sql = getTeamWriteDb();
    const token = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(token).digest('hex');
    // Uma única transação PostgreSQL valida dono, concorrência, convite pendente
    // e gravação. Requer a migração 02d_CONVITES_ATOMICOS.sql.
    const created = await sql`
      SELECT invitation_id AS id, valid_until AS expires_at
      FROM public.issue_team_invitation(${owner.user.id}, ${email}, ${name}, ${hash})
    `;
    // Não enviamos e-mails automaticamente. Proprietário compartilha o link com o destinatário correto.
    // Jamais guardar o token bruto no banco nem escrever o link em logs.
    const link = '/convite?token=' + encodeURIComponent(token);
    return NextResponse.json({ invitation: created[0], link }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Não foi possível emitir o convite. Confirme a migração SQL 02D.' }, { status: 500 });
  }
}

export async function GET() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: 'Sem autorização.' }, { status: 403 });
  try {
    const sql = getDb();
    const invitations = await sql`
      SELECT id, invited_email, invited_name, expires_at, created_at
      FROM public.team_invitations
      WHERE organization_id = ${owner.organizationId}
        AND accepted_at IS NULL AND revoked_at IS NULL
        AND expires_at > now()
      ORDER BY created_at DESC LIMIT 100
    `;
    return NextResponse.json({ invitations }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Falha ao consultar convites.' }, { status: 500 });
  }
}
