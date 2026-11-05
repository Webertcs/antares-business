import {redirect} from 'next/navigation';
import {requireOwner} from '@/lib/equipe/auth';
import RelationshipShell from '../../RelationshipShell';
import BookingClient from './BookingClient';
export const dynamic='force-dynamic';
export default async function Page(){
 if(!await requireOwner())redirect('/sem-acesso');
 return <RelationshipShell title="Reservas"><BookingClient enabled={process.env.ANTARES_AGENDA_WRITES_ENABLED==='true'}/></RelationshipShell>;
}
