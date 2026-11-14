import {redirect} from 'next/navigation';
import {requireDeveloper} from '@/lib/equipe/auth';
import OficinaV1 from './OficinaV1';
import './oficina.css';
export const dynamic='force-dynamic';
export default async function Page(){
 const developer=await requireDeveloper();
 if(!developer)redirect('/sem-acesso');
 return <OficinaV1/>;
}
