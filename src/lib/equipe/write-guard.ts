import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getTeamWriteDb } from './auth';

/** Fail closed; a URL só é válida quando a role de LOGIN é limitada a
 * executar quatro funções SECURITY DEFINER validadas. */
export async function assertSensitiveWriteAllowed(request: NextRequest): Promise<NextResponse | null> {
  const deny = (message: string, status = 503) =>
    NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });

  if (process.env.ANTARES_TEAM_WRITES_ENABLED !== 'true')
    return deny('Gestão de equipe ainda não homologada.');

  const configured = process.env.ANTARES_APP_ORIGIN;
  const expectedRole = process.env.ANTARES_DB_RUNTIME_ROLE;
  if (!configured || expectedRole !== 'antares_team_runtime')
    return deny('Configuração de segurança incompleta.');
  let origin: string;
  try { origin = new URL(configured).origin; }
  catch { return deny('Origem inválida.'); }
  if (request.headers.get('origin') !== origin) return deny('Origem não autorizada.', 403);
  if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json')
    return deny('Envie JSON.', 415);

  try {
    const sql = getTeamWriteDb();
    const rows = await sql`
      SELECT
        current_user AS runtime_role, r.rolcanlogin, r.rolsuper, r.rolbypassrls,
        (
          SELECT bool_and(c.relrowsecurity AND c.relowner <> r.oid AND
            NOT has_table_privilege(r.oid,c.oid,'SELECT') AND
            NOT has_table_privilege(r.oid,c.oid,'INSERT') AND
            NOT has_table_privilege(r.oid,c.oid,'UPDATE') AND
            NOT has_table_privilege(r.oid,c.oid,'DELETE'))
          FROM pg_class c WHERE c.oid IN (
            'public.organizations'::regclass,
            'public.team_members'::regclass,
            'public.team_invitations'::regclass,
            'public.team_security_events'::regclass
          )
        ) AS tables_restricted,
        (
          SELECT count(*)
          FROM pg_proc p
          WHERE p.pronamespace='public'::regnamespace AND p.prosecdef
            AND pg_get_userbyid(p.proowner)='neondb_owner'
            AND p.proname IN ('issue_team_invitation','accept_team_invitation',
                              'revoke_team_invitation','suspend_team_collaborator')
            AND has_function_privilege(r.oid,p.oid,'EXECUTE')
        ) AS allowed_functions
      FROM pg_roles r WHERE r.rolname=current_user
    `;
    const row = rows[0];
    if (!row || row.runtime_role !== expectedRole || row.rolcanlogin !== true ||
        row.rolsuper !== false || row.rolbypassrls !== false ||
        row.tables_restricted !== true || Number(row.allowed_functions) !== 4)
      return deny('Papel de banco e operações da equipe não homologados.');
  } catch {
    return deny('Não foi possível validar o isolamento da conexão.');
  }
  return null;
}
