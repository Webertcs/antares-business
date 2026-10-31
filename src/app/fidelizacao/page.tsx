import {redirect} from 'next/navigation';
import {requireOwner} from '@/lib/equipe/auth';
import FidelizacaoClient from './FidelizacaoClient';
export const dynamic='force-dynamic';
export default async function Page(){
 if(!await requireOwner()) redirect('/sem-acesso');
 return <FidelizacaoClient/>;
}
