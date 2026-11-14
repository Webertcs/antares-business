import {redirect} from 'next/navigation';
import {requireOwner} from '@/lib/equipe/auth';
import DashboardClient from '../../DashboardClient';
import ProviderClient from './ProviderClient';

export const dynamic='force-dynamic';

export default async function Page(){
 const owner=await requireOwner();
 if(!owner)redirect('/sem-acesso');
 const isDeveloper=Boolean(process.env.ANTARES_DEVELOPER_SUBJECT)&&process.env.ANTARES_DEVELOPER_SUBJECT===owner.user.id;
 return <DashboardClient role="owner" profileKey={owner.memberId} accountLabel={isDeveloper?'Administrador técnico':'Proprietário'} moduleTitle="Configurações">
  <ProviderClient enabled={process.env.ANTARES_PROVIDER_WRITES_ENABLED==='true'}/>
 </DashboardClient>;
}
