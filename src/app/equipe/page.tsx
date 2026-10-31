import { redirect } from 'next/navigation';
import { requireOwner } from '@/lib/equipe/auth';
import EquipeClient from './EquipeClient';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const ctx = await requireOwner();
  if (!ctx) redirect('/sem-acesso');
  return <EquipeClient writesEnabled={process.env.ANTARES_TEAM_WRITES_ENABLED === 'true' && Boolean(process.env.DATABASE_URL_TEAM_RUNTIME && process.env.ANTARES_APP_ORIGIN && process.env.ANTARES_DB_RUNTIME_ROLE)} />;
}
