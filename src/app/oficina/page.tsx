import {redirect} from 'next/navigation';
import {requireOwner} from '@/lib/equipe/auth';
import OficinaV1 from './OficinaV1';
import './oficina.css';
export const dynamic='force-dynamic';
export default async function Page(){
 if(!await requireOwner())redirect('/sem-acesso');
 return <OficinaV1/>;
}
