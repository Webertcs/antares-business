import {redirect} from 'next/navigation';
import {requireMember,getDb,isDeveloperSubject} from '@/lib/equipe/auth';
import ProfileClient from './ProfileClient';
import DashboardClient from '../DashboardClient';
export const dynamic='force-dynamic';
export default async function ProfilePage(){
 const ctx=await requireMember();
 if(!ctx)redirect('/auth/sign-in');
 const sql=getDb();
 const rows=await sql`SELECT full_name, email FROM public.team_members WHERE id=${ctx.memberId} AND organization_id=${ctx.organizationId} LIMIT 1`;
 const isDeveloper=ctx.role==='owner'&&isDeveloperSubject(ctx.user.id);
 return <DashboardClient isDeveloper={isDeveloper} role={ctx.role} accountLabel={isDeveloper?'Administrador técnico':ctx.role==='owner'?'Proprietário':'Colaborador'} profileKey={ctx.memberId} moduleTitle="Meu perfil"><ProfileClient email={String(rows[0]?.email||ctx.user.email||'')} name={String(rows[0]?.full_name||'')} role={isDeveloper?'developer':ctx.role} profileKey={ctx.memberId}/></DashboardClient>;
}
