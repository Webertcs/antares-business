import { redirect } from 'next/navigation';
import { requireMember } from '@/lib/equipe/auth';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const context = await requireMember();
  if (!context) redirect('/sem-acesso');
  return <DashboardClient />;
}
