import { redirect } from 'next/navigation';
import { requireOwner } from '@/lib/equipe/auth';
import ClientsPage from './ClientesClient';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const owner = await requireOwner();
  if (!owner) redirect('/sem-acesso');
  // Não habilitar a UI independentemente da API:
  // duas barreiras exigidas para evitar falso botão de cadastro funcional.
  const writesEnabled = process.env.ANTARES_CRM_WRITES_ENABLED === 'true'
    && process.env.ANTARES_CRM_SECURITY_APPROVED === 'true';
  return <ClientsPage writesEnabled={writesEnabled} />;
}
