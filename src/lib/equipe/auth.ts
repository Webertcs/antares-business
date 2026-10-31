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
