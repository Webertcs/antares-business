import {requireOwner} from '@/lib/equipe/auth';
import {redirect} from 'next/navigation';
import ReceberClient from './ReceberClient';
export default async function Page(){const owner=await requireOwner();if(!owner)redirect('/sem-acesso');return <ReceberClient/>;}
