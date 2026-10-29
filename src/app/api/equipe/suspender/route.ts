import { assertSensitiveWriteAllowed } from '@/lib/equipe/write-guard';
import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, getTeamWriteDb } from '@/lib/equipe/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const denied = await assertSensitiveWriteAllowed(request);
  if (denied) return denied;
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: 'Apenas o proprietário pode suspender colaboradores.' }, { status: 403 });
  if (Number(request.headers.get('content-length') || 0) > 1024) return NextResponse.json({ error: 'Requisição grande demais' }, { status: 413 });
  try {
    const { memberId } = await request.json();
    if (typeof memberId !== 'string' || !/^[a-f0-9-]{36}$/i.test(memberId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const sql = getTeamWriteDb();
    const rows = await sql`SELECT public.suspend_team_collaborator(${owner.user.id}, ${memberId}::uuid) AS success`;
    if (!rows[0]?.success) return NextResponse.json({ error: 'Colaborador não encontrado ou operação não permitida.' }, { status: 409 });
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Não foi possível suspender o acesso.' }, { status: 500 });
  }
}
