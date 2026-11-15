import {redirect} from 'next/navigation';
import {requireOwner} from '@/lib/equipe/auth';
import HomologacaoClient from './HomologacaoClient';
export const dynamic='force-dynamic';
export default async function Page(){
 const owner=await requireOwner();if(!owner || !process.env.ANTARES_DEVELOPER_SUBJECT || owner.user.id!==process.env.ANTARES_DEVELOPER_SUBJECT)redirect('/sem-acesso');
 const flags={
 agenda:process.env.ANTARES_AGENDA_WRITES_ENABLED==='true',
 contrato:process.env.ANTARES_CONTRACT_WRITES_ENABLED==='true',
 educacional:process.env.ANTARES_EDUCATION_WRITES_ENABLED==='true',
 prestador:process.env.ANTARES_PROVIDER_WRITES_ENABLED==='true',
 financeiro:process.env.ANTARES_FINANCE_WRITES_ENABLED==='true'
 };
 return <HomologacaoClient flags={flags}/>;
}
