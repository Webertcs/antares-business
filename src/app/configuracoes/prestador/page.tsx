import {redirect} from 'next/navigation';
import {requireOwner} from '@/lib/equipe/auth';
import ProviderClient from './ProviderClient';
export const dynamic='force-dynamic';
export default async function Page(){if(!await requireOwner())redirect('/sem-acesso');return <ProviderClient enabled={process.env.ANTARES_PROVIDER_WRITES_ENABLED==='true'}/>;}
