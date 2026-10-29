import { redirect } from 'next/navigation';
import { requireOwner } from '@/lib/equipe/auth';
import EquipeClient from './EquipeClient';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const ctx = await requireOwner();
  if (!ctx) redirect('/sem-acesso');
  return <EquipeClient />;
}
