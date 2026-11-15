import {redirect} from 'next/navigation';
import {requireOwner} from '@/lib/equipe/auth';
import IntelligenceClient from './IntelligenceClient';
export const dynamic='force-dynamic';
export default async function Page(){
 if(!await requireOwner())redirect('/sem-acesso');
 return <IntelligenceClient/>;
}
