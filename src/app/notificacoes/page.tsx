import {redirect} from 'next/navigation';
import {requireOwner} from '@/lib/equipe/auth';
import NotificationsClient from './NotificationsClient';
export const dynamic='force-dynamic';
export default async function Page(){
 if(!await requireOwner())redirect('/sem-acesso');
 return <NotificationsClient/>;
}
