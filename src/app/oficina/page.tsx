import { redirect } from 'next/navigation';
import { requireDeveloper } from '@/lib/equipe/auth';
import { signOutAction } from '../perfil/actions';
export const dynamic = 'force-dynamic';

export default async function Page() {
  const developer = await requireDeveloper();
  if (!developer) redirect('/sem-acesso');
  const version = /^[a-f0-9]{7,40}$/i.test(process.env.COMMIT_REF ?? '') ? process.env.COMMIT_REF!.slice(0, 7) : null;
  return <main style={{minHeight:'100vh',background:'#0b1730',color:'#eff6ff',padding:'clamp(20px,5vw,64px)'}}>
    <div style={{maxWidth:800,margin:'0 auto'}}>
      <header style={{borderBottom:'1px solid #385579',paddingBottom:24}}>
        <p style={{letterSpacing:3,color:'#91caff'}}>ANTARES BUSINESS</p>
        <h1>Área do Desenvolvedor</h1>
        <p>Manutenção técnica e diagnóstico, sem consulta aos dados comerciais.</p>
      </header>
      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:16,marginTop:24}}>
        {[
          ['Autenticação','Sessão verificada'],
          ['Aplicação','Respondendo'],
          ['Banco de dados','Consulta de acesso concluída'],
          ['Perfil',developer.technicalOnly?'Suporte técnico isolado':'Transição — acesso comercial ainda ativo'],
          ['Versão',version ?? 'Consultar deploy no Netlify']
        ].map(([label,value])=><div key={label} style={{border:'1px solid #385579',borderRadius:12,padding:18,background:'#122340'}}><p style={{color:'#a9c7ed'}}>{label}</p><strong>{value}</strong></div>)}
      </section>
      <p style={{marginTop:24,lineHeight:1.6}}>Este painel não exibe clientes, agenda, contratos, valores ou atividades da empresa. O acesso à infraestrutura deve ser usado apenas para manutenção autorizada.</p>
      {!developer.technicalOnly && <p role="status" style={{color:'#ffda91'}}>Transferência pendente: sua conta ainda possui vínculo comercial ativo. Aguarde a confirmação do proprietário antes de arquivar esse vínculo.</p>}
      <form action={signOutAction} style={{marginTop:24}}><button type="submit" style={{padding:'12px 24px',background:'#1e5ad5',color:'#fff',border:0,borderRadius:8}}>Sair da conta</button></form>
    </div>
  </main>;
}
