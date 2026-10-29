import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { neon } from '@neondatabase/serverless';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) redirect('/auth/sign-in');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não configurada');
  const sql = neon(process.env.DATABASE_URL);
  const members = await sql`
    SELECT id, role FROM team_members
    WHERE auth_subject = ${session.user.id} AND active = true
    LIMIT 1
  `;
  if (members.length === 0) redirect('/sem-acesso');
  return <DashboardClient />;
}
