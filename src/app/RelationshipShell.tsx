import {redirect} from 'next/navigation';
import {requireMember} from '@/lib/equipe/auth';
import DashboardClient from './DashboardClient';
export default async function RelationshipShell({children,title}:{children:React.ReactNode;title:string}){
 const ctx=await requireMember();
 if(!ctx)redirect('/sem-acesso');
 const developer=ctx.role==='owner'&&Boolean(process.env.ANTARES_DEVELOPER_SUBJECT)&&process.env.ANTARES_DEVELOPER_SUBJECT===ctx.user.id;
 return <DashboardClient profileKey={ctx.memberId} accountLabel={developer?'Proprietário / Desenvolvedor':ctx.role==='owner'?'Proprietário':'Colaborador'} moduleTitle={title}>{children}</DashboardClient>;
}
