import Link from 'next/link';
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
    <section style={{background:'#eef5ff',border:'1px solid #c9dcf7',borderRadius:14,padding:24,marginTop:18}}>
      <h2 style={{fontSize:19,fontWeight:750,margin:'0 0 10px'}}>Modelo padrão do planetário</h2>
      <p style={{lineHeight:1.6,margin:0}}>Estamos preparando o cadastro seguro do modelo reutilizável. Depois de configurado, cada novo evento terá uma cópia independente do checklist, preservando as tarefas e o histórico de eventos anteriores.</p>
      <p style={{margin:'14px 0 0',fontWeight:600}}>Nenhum modelo foi salvo ou alterado nesta etapa.</p>
    </section>
  </main>;
}
