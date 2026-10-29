import {redirect} from 'next/navigation';
import {requireOwner} from '@/lib/equipe/auth';
import OperacaoV1 from './OperacaoV1';
export const dynamic='force-dynamic';
export default async function Page(){
 if(!await requireOwner())redirect('/sem-acesso');
 return <OperacaoV1/>;
}