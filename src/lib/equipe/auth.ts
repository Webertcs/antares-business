import 'server-only';
import { auth } from '@/lib/auth/server';
import { neon } from '@neondatabase/serverless';

export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente');
  return neon(process.env.DATABASE_URL);
}

export async function requireOwner() {
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user?.id) return null;
  const sql = getDb();
  const memberships = await sql`
    SELECT id, organization_id, role FROM public.team_members
    WHERE auth_subject = ${user.id} AND active = true AND role = 'owner'
    ORDER BY created_at LIMIT 1
  `;
  if (!memberships.length) return null;
  return { user, organizationId: String(memberships[0].organization_id) };
}
