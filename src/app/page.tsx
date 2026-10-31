import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { requireMember } from '@/lib/equipe/auth';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) redirect('/auth/sign-in');
  const context = await requireMember();
  if (!context) redirect('/sem-acesso');
  return <DashboardClient />;
}
