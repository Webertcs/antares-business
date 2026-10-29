import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from './auth';

/**
 * Fail closed until the deployment uses a restricted runtime role and
 * tenant policies. An environment flag alone cannot bypass this check.
 */
export async function assertSensitiveWriteAllowed(request: NextRequest): Promise<NextResponse | null> {
  const deny = (message: string, status = 503) =>
    NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });

  if (process.env.ANTARES_TEAM_WRITES_ENABLED !== 'true')
    return deny('Gestão de equipe ainda não homologada.');

  const expectedRole = process.env.ANTARES_DB_RUNTIME_ROLE;
  const configured = process.env.ANTARES_APP_ORIGIN;
  if (!expectedRole || !configured) return deny('Configuração segura de aplicação incompleta.');

  let expectedOrigin: string;
  try { expectedOrigin = new URL(configured).origin; }
  catch { return deny('Origem da aplicação inválida.'); }

  if (request.headers.get('origin') !== expectedOrigin) return deny('Origem não autorizada.', 403);
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json')
    return deny('Envie JSON.', 415);

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT
        current_user AS runtime_role,
        r.rolsuper,
        r.rolbypassrls,
        bool_and(c.relrowsecurity AND c.relowner <> r.oid) AS rls_enforced,
        count(DISTINCT p.polname) AS policy_count
      FROM pg_roles r
      JOIN pg_class c ON c.oid IN (
        'public.team_members'::regclass,
        'public.team_invitations'::regclass,
        'public.team_security_events'::regclass
      )
      LEFT JOIN pg_policy p ON p.polrelid = c.oid
      WHERE r.rolname = current_user
      GROUP BY r.oid, r.rolsuper, r.rolbypassrls
    `;
    const row = rows[0];
    if (!row || row.runtime_role !== expectedRole || row.rolsuper ||
        row.rolbypassrls || row.rls_enforced !== true || Number(row.policy_count) === 0)
      return deny('Permissões e RLS do banco ainda não homologados.');
  } catch {
    return deny('Não foi possível validar as permissões do banco.');
  }
  return null;
}
