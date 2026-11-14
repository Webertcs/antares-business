import {redirect} from 'next/navigation';
import {requireMember,isDeveloperSubject} from '@/lib/equipe/auth';
import DashboardClient from './DashboardClient';
export default async function RelationshipShell({children,title}:{children:React.ReactNode;title:string}){
 const ctx=await requireMember();
 if(!ctx)redirect('/sem-acesso');
 const developer=ctx.role==='owner'&&isDeveloperSubject(ctx.user.id);
 return <DashboardClient role={ctx.role} isDeveloper={developer} profileKey={ctx.memberId} accountLabel={developer?'Administrador técnico':ctx.role==='owner'?'Proprietário':'Colaborador'} moduleTitle={title}>{children}</DashboardClient>;
}
