import { redirect } from 'next/navigation';
import { requireOwner } from '@/lib/equipe/auth';
import ClientsPage from './ClientesClient';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const ctx = await requireOwner();
  if (!ctx) redirect('/sem-acesso');
  return <ClientsPage writesEnabled={false} />;
  // Só habilitar mediante flag do servidor e validação completa
  // de autenticação, isolamento A/B e dependências de produção.
}
