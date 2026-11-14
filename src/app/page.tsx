import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { requireMember, isDeveloperSubject } from '@/lib/equipe/auth';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) redirect('/auth/sign-in');
  const context = await requireMember();
  if (!context) redirect('/sem-acesso');
  const isDeveloper = context.role === 'owner' && isDeveloperSubject(context.user.id);
  return <DashboardClient isDeveloper={isDeveloper} agendaWritesEnabled={process.env.ANTARES_AGENDA_WRITES_ENABLED==='true'} role={context.role} profileKey={context.memberId} accountLabel={isDeveloper ? 'Administrador técnico' : context.role === 'owner' ? 'Proprietário' : 'Colaborador'} />;
}
