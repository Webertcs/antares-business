import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'node:crypto';
import { requireOwner, getDb } from '@/lib/equipe/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
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
    const sql = getDb();
    const already = await sql`SELECT id FROM team_members WHERE organization_id = ${owner.organizationId} AND lower(email) = ${email} AND active = true LIMIT 1`;
    if (already.length) return NextResponse.json({ error: 'Integrante já ativo nesta organização' }, { status: 409 });
    const token = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(token).digest('hex');
    const created = await sql`
      INSERT INTO public.team_invitations (organization_id, invited_email, invited_name, token_sha256, expires_at, created_by_member_id)
      VALUES (${owner.organizationId}, ${email}, ${name}, ${hash}, now() + interval '48 hours', ${owner.memberId})
      RETURNING id, expires_at
    `;
    // Não enviamos e-mails automaticamente. Proprietário compartilha o link com o destinatário correto.
    // Jamais guardar o token bruto no banco nem escrever o link em logs.
    const url = new URL('/convite', request.nextUrl.origin);
    url.searchParams.set('token', token);
    return NextResponse.json({ invitation: created[0], link: url.toString() }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Não foi possível emitir o convite. Confirme a migração SQL 02D.' }, { status: 500 });
  }
}
