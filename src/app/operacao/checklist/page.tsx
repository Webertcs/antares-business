import Link from 'next/link';
import ChecklistEditor from './ChecklistEditor';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { requireMember } from '@/lib/equipe/auth';

export const dynamic = 'force-dynamic';

export default async function ChecklistOperacional() {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) redirect('/auth/sign-in');
  const context = await requireMember();
  if (!context) redirect('/sem-acesso');
  return <main style={{maxWidth:1000,margin:'32px auto',padding:'0 20px',color:'#173c73'}}>
    <Link href='/?section=operacao' style={{color:'#2563c9',fontWeight:700,textDecoration:'none'}}>← Voltar à Central operacional</Link>
    <header style={{background:'linear-gradient(115deg,#153c78,#1765bd)',color:'white',borderRadius:14,padding:'22px 26px',marginTop:16}}>
      <h1 style={{fontSize:25,fontWeight:800,margin:0}}>Checklist operacional</h1>
      <p style={{margin:'8px 0 0',color:'#dcecff'}}>Modelo padrão para preparar as apresentações.</p>
    </header>
    <ChecklistEditor/>
  </main>;
}
