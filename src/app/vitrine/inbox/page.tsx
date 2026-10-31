import {redirect} from 'next/navigation';
import {requireOwner} from '@/lib/equipe/auth';
import Inbox from './InboxClient';
export const dynamic='force-dynamic';
export default async function Page(){const owner=await requireOwner();if(!owner)redirect('/sem-acesso');return <Inbox conversionEnabled={process.env.ANTARES_VITRINE_CONVERSION_ENABLED==='true' && process.env.ANTARES_CRM_WRITES_ENABLED==='true' && process.env.ANTARES_CRM_SECURITY_APPROVED==='true'}/>;}
