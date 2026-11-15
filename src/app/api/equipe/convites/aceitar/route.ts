import { assertSensitiveWriteAllowed } from '@/lib/equipe/write-guard';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { auth } from '@/lib/auth/server';
import { getTeamWriteDb } from '@/lib/equipe/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const denied = await assertSensitiveWriteAllowed(request);
  if (denied) return denied;
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user?.id || !user.email || user.emailVerified !== true)
    return NextResponse.json({ error: 'Entre com a conta convidada e confirme o e-mail antes de aceitar.' }, { status: 403 });
  try {
    if (Number(request.headers.get('content-length') || '0') > 1024)
      return NextResponse.json({ error: 'Requisição muito grande' }, { status: 413 });
    const body = await request.json();
    const token = typeof body.token === 'string' ? body.token : '';
    if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: 'Convite inválido' }, { status: 400 });
    const hash = createHash('sha256').update(token).digest('hex');
    const sql = getTeamWriteDb();
    const result = await sql`SELECT public.accept_team_invitation(${hash}, ${user.id}, ${user.email.trim().toLowerCase()}) AS member_id`;
    if (!result[0]?.member_id) return NextResponse.json({ error: 'Convite expirado, revogado, utilizado ou vinculado a outro e-mail.' }, { status: 409 });
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Não foi possível aceitar o convite. Confira a migração SQL.' }, { status: 500 });
  }
}
