import {redirect} from 'next/navigation';
import {requireOwner} from '@/lib/equipe/auth';
import FinanceiroClient from './FinanceiroClient';
export const dynamic='force-dynamic';
export default async function Page(){
 if(!await requireOwner())redirect('/sem-acesso');
 return <FinanceiroClient/>;
}
