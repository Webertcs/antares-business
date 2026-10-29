import 'server-only';
import { NextRequest, NextResponse } from 'next/server';

/** Fail closed by default until Neon migrations, roles, RLS and audit are homologated. */
export function assertSensitiveWriteAllowed(request: NextRequest): NextResponse | null {
  if (process.env.ANTARES_TEAM_WRITES_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'Gestão de equipe ainda não homologada neste ambiente.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Use a fixed configured origin in production; never trust Host/X-Forwarded-Host.
  const configured = process.env.ANTARES_APP_ORIGIN;
  if (process.env.NODE_ENV === 'production' && !configured) {
    return NextResponse.json({ error: 'Origem da aplicação não configurada.' }, { status: 503 });
  }
  let expected: string;
  try {
    expected = new URL(configured || request.nextUrl.origin).origin;
  } catch {
    return NextResponse.json({ error: 'Origem da aplicação inválida.' }, { status: 503 });
  }
  const origin = request.headers.get('origin');
  if (!origin || origin !== expected) {
    return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403 });
  }
  const contentType = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    return NextResponse.json({ error: 'Envie JSON.' }, { status: 415 });
  }
  return null;
}
