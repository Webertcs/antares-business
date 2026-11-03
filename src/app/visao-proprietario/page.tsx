import {redirect} from 'next/navigation';
import {requireOwner} from '@/lib/equipe/auth';
import DashboardClient from '../DashboardClient';
export const dynamic='force-dynamic';

/**
 * Prévia visual do painel do proprietário, para refinamento.
 * NÃO cria usuário, sessão de outro usuário, nem altera privilégios.
 */
export default async function VisaoProprietarioPage(){
 const owner=await requireOwner();
 if(!owner || !process.env.ANTARES_DEVELOPER_SUBJECT || owner.user.id!==process.env.ANTARES_DEVELOPER_SUBJECT)redirect('/sem-acesso');
 return <DashboardClient accountLabel="Proprietário" ownerPreview/>;
}
