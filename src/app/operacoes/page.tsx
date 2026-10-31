import {redirect} from 'next/navigation';
import {requireOwner} from '@/lib/equipe/auth';
import OperacaoV1 from './OperacaoV1';
export const dynamic='force-dynamic';
export default async function Page(){
 if(!await requireOwner())redirect('/sem-acesso');
 const writesEnabled=process.env.ANTARES_V1_WRITES_ENABLED==='true'
  && process.env.ANTARES_V1_SECURITY_APPROVED==='true';
 return <OperacaoV1 writesEnabled={writesEnabled}/>;
}