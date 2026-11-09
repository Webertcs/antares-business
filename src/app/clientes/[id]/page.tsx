import {redirect} from 'next/navigation';
import {requireOwner,getDb} from '@/lib/equipe/auth';
import ClientDetails from './ClientDetails';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){
 if(!await requireOwner())redirect('/sem-acesso');
 const {id}=await params;
 const db=getDb();
 const attendanceReady=await db`SELECT to_regclass('public.antares_event_attendance') IS NOT NULL AS ok`;
 const attendance=attendanceReady[0]?.ok?await db`SELECT e.id::text AS id,e.title,e.event_date,e.expected_attendees,a.actual_students FROM public.antares_event_attendance a JOIN public.crm_events e ON e.id=a.event_id AND e.organization_id=a.organization_id JOIN public.crm_clients c ON c.id=e.client_id AND c.organization_id=e.organization_id WHERE e.client_id=${id}::uuid ORDER BY e.event_date DESC NULLS LAST,e.title`:[];
 const domes=await db`SELECT id,name,capacity FROM public.antares_domes WHERE active=true AND organization_id=(SELECT organization_id FROM public.crm_clients WHERE id=${id}::uuid LIMIT 1) ORDER BY name`;
 const attendanceRows=attendance.map(r=>({id:String(r.id),title:String(r.title),event_date:r.event_date?new Date(String(r.event_date)).toISOString():null,expected_attendees:r.expected_attendees==null?null:Number(r.expected_attendees),actual_students:Number(r.actual_students||0)}));
 return <ClientDetails domes={domes.map(d=>({id:String(d.id),name:String(d.name),capacity:d.capacity==null?null:Number(d.capacity)}))} attendance={attendanceRows} id={id} writesEnabled={process.env.ANTARES_EDUCATION_WRITES_ENABLED==='true'} proposalWritesEnabled={process.env.ANTARES_CLIENT_PROPOSALS_WRITES_ENABLED==='true'} contractWritesEnabled={process.env.ANTARES_V1_WRITES_ENABLED==='true'&&process.env.ANTARES_V1_SECURITY_APPROVED==='true'&&process.env.ANTARES_CONTRACT_WRITES_ENABLED==='true'}/>;
}
