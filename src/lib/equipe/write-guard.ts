import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getTeamWriteDb } from './auth';

/**
 * Bloqueio por padrão. Esta inspeção é somente uma condição necessária:
 * políticas RLS e direitos precisam de testes de isolamento A/B independentes.
 */
export async function assertSensitiveWriteAllowed(request: NextRequest): Promise<NextResponse | null> {
  const deny = (message: string, status = 503) =>
    NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });

  if (process.env.ANTARES_TEAM_WRITES_ENABLED !== 'true')
    return deny('Gestão de equipe ainda não homologada.');

  const expectedRole = process.env.ANTARES_DB_RUNTIME_ROLE;
  const configured = process.env.ANTARES_APP_ORIGIN;
  if (!expectedRole || !configured) return deny('Configuração segura incompleta.');

  let expectedOrigin: string;
  try { expectedOrigin = new URL(configured).origin; }
  catch { return deny('Origem configurada inválida.'); }

  if (request.headers.get('origin') !== expectedOrigin) return deny('Origem não autorizada.', 403);
  if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json')
    return deny('Envie JSON.', 415);

  try {
    const sql = getTeamWriteDb();
    const rows = await sql`
      SELECT
        current_user AS runtime_role,
        r.rolsuper, r.rolbypassrls, r.rolcanlogin,
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled,
        c.relforcerowsecurity AS rls_forced,
        c.relowner = r.oid AS owns_table,
        EXISTS (
          SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
        ) AS has_policy
      FROM pg_roles r
      CROSS JOIN pg_class c
      WHERE r.rolname = current_user
        AND c.oid IN (
          'public.organizations'::regclass,
          'public.team_members'::regclass,
          'public.team_invitations'::regclass,
          'public.team_security_events'::regclass
        )
    `;
    if (rows.length !== 4 || rows.some(row =>
      row.runtime_role !== expectedRole ||
      row.rolsuper !== false ||
      row.rolbypassrls !== false ||
      row.rolcanlogin !== true ||
      row.rls_enabled !== true ||
      row.owns_table !== false ||
      row.has_policy !== true
    )) return deny('Isolamento do banco ainda não homologado.');
    // Não substitui testes funcionais de tenant nem concede acesso por si só.
  } catch {
    return deny('Falha na verificação de permissões do banco.');
  }
  return null;
}
