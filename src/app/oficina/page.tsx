import {redirect} from 'next/navigation';
import {requireOwner} from '@/lib/equipe/auth';
import OficinaV1 from './OficinaV1';
import './oficina.css';
export const dynamic='force-dynamic';
export default async function Page(){
 const owner=await requireOwner();
 if(!owner || !process.env.ANTARES_DEVELOPER_SUBJECT || owner.user.id!==process.env.ANTARES_DEVELOPER_SUBJECT)redirect('/sem-acesso');
 return <OficinaV1/>;
}
