import {redirect} from 'next/navigation';
import {requireOwner} from '@/lib/equipe/auth';
import ClientDetails from './ClientDetails';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){
 if(!await requireOwner())redirect('/sem-acesso');
 const {id}=await params;
 return <ClientDetails id={id} writesEnabled={process.env.ANTARES_EDUCATION_WRITES_ENABLED==='true'} proposalWritesEnabled={process.env.ANTARES_CLIENT_PROPOSALS_WRITES_ENABLED==='true'} contractWritesEnabled={process.env.ANTARES_V1_WRITES_ENABLED==='true'&&process.env.ANTARES_V1_SECURITY_APPROVED==='true'&&process.env.ANTARES_CONTRACT_WRITES_ENABLED==='true'}/>;
}
