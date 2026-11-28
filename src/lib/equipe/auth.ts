import 'server-only';
import { auth } from '@/lib/auth/server';
import { neon } from '@neondatabase/serverless';

export function getTeamWriteDb() {
  if (!process.env.DATABASE_URL_TEAM_RUNTIME) throw new Error('DATABASE_URL_TEAM_RUNTIME ausente');
  return neon(process.env.DATABASE_URL_TEAM_RUNTIME);
}

export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente');
  return neon(process.env.DATABASE_URL);
}

/**
 * Fail-closed: uma sessão só pode acessar dados se estiver vinculada
 * inequivocamente a uma organização ativa.
 *
 * Enquanto o produto não possuir seletor de organização com autorização
 * explícita, múltiplos vínculos ativos bloqueiam o acesso em vez de escolher
 * silenciosamente o primeiro registro.
 */
export async function requireMember() {
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user?.id) return null;

  const sql = getDb();
  const memberships = await sql`
    SELECT id, organization_id, role
    FROM public.team_members
    WHERE auth_subject = ${user.id}
      AND active = true
      AND role IN ('owner', 'collaborator')
    LIMIT 2
  `;

  if (memberships.length !== 1) return null;
  const member = memberships[0];
  return {
    user,
    memberId: String(member.id),
    organizationId: String(member.organization_id),
    role: member.role as 'owner' | 'collaborator',
  };
}

export async function requireOwner() {
  const context = await requireMember();
  return context?.role === 'owner' ? context : null;
}

/** Acesso técnico restrito ao subject autenticado configurado no servidor. */
export function isDeveloperSubject(subject: string) {
  const configured = process.env.ANTARES_DEVELOPER_SUBJECT;
  return Boolean(configured) && configured === subject;
}

/** A oficina não concede vínculo comercial. A identidade precisa ser
 *  explicitamente configurada e possuir um único registro de proprietário
 *  ativo (transição) ou arquivado (suporte após a entrega).
 *  Não retorna organização, identificador de membro ou dados comerciais.
 */
export async function requireDeveloper() {
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user?.id || user.emailVerified !== true || !isDeveloperSubject(user.id)) return null;
  const sql = getDb();
  const rows = await sql`
    SELECT role, active, archived_at IS NOT NULL AS archived
    FROM public.team_members WHERE auth_subject = ${user.id} LIMIT 2
  `;
  if (rows.length !== 1 || rows[0].role !== 'owner') return null;
  const row = rows[0];
  if (row.active === false && row.archived === true) return { user, technicalOnly: true };
  if (row.active === true && row.archived === false) return { user, technicalOnly: false };
  return null;
}
