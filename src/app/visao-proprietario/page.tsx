import {redirect} from 'next/navigation';
import {requireDeveloper} from '@/lib/equipe/auth';
import DashboardClient from '../DashboardClient';
export const dynamic='force-dynamic';

/**
 * Prévia visual do painel do proprietário, para refinamento.
 * NÃO cria usuário, sessão de outro usuário, nem altera privilégios.
 */
export default async function VisaoProprietarioPage(){
 const owner=await requireDeveloper();
 if(!owner)redirect('/sem-acesso');
 return <DashboardClient accountLabel="Proprietário" profileKey={owner.memberId} ownerPreview/>;
}
