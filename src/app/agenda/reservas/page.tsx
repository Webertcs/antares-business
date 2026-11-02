import {redirect} from 'next/navigation';
import {requireOwner} from '@/lib/equipe/auth';
import BookingClient from './BookingClient';
export const dynamic='force-dynamic';
export default async function Page(){if(!await requireOwner())redirect('/sem-acesso');return <BookingClient enabled={process.env.ANTARES_AGENDA_WRITES_ENABLED==='true'}/>;}
