import {redirect} from 'next/navigation';
import {requireOwner} from '@/lib/equipe/auth';
import EducacionalClient from './EducacionalClient';
export const dynamic='force-dynamic';
export default async function Page(){
 if(!await requireOwner())redirect('/sem-acesso');
 return <EducacionalClient writesEnabled={process.env.ANTARES_EDUCATION_WRITES_ENABLED==='true'}/>;
}
