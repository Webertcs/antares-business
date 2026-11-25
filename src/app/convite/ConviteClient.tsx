'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ConviteFlow() {
  const search=useSearchParams();
  const token=search.get('token')||'';
  const valid=/^[a-f0-9]{64}$/.test(token);
  const query=valid?'?token='+encodeURIComponent(token):'';
  return <main style={{maxWidth:520,margin:'12vh auto',padding:30,fontFamily:'system-ui'}}>
    <h1 style={{fontSize:27,fontWeight:750}}>Bem-vindo à equipe ANTARES!</h1>
    <p>Use o mesmo e-mail informado pelo responsável do planetário. O convite é válido por 48 horas.</p>
    <p><strong>Seu primeiro acesso em 3 etapas:</strong></p>
    <ol style={{listStyle:'decimal',paddingLeft:24,lineHeight:1.7}}>
      <li>Criar sua conta e escolher uma senha.</li>
      <li>Confirmar o e-mail com o código recebido.</li>
      <li>Entrar e aceitar o convite. O painel abre após a validação.</li>
    </ol>
    {valid?<div style={{display:'grid',gap:12,margin:'20px 0'}}>
      <a href={'/auth/primeiro-acesso'+query} style={{background:'#2563eb',color:'#fff',padding:13,borderRadius:9,textAlign:'center',fontWeight:700}}>Etapa 1 de 3 · Criar minha conta</a>
      <a href={'/auth/verificar-email'+query}>Já criei minha conta · Confirmar e-mail (etapa 2)</a>
      <a href={'/auth/sign-in'+query}>Já tenho conta confirmada · Entrar e aceitar convite (etapa 3)</a>
    </div>:<p role="status" style={{marginTop:20}}>Abra o link de convite recebido do responsável para começar. Se já faz parte da equipe, <a href="/auth/sign-in" style={{color:'#1d4ed8'}}>entre na sua conta</a>.</p>}
  </main>;
}

export default function ConviteClient(){return <Suspense fallback={<p>Carregando convite...</p>}><ConviteFlow/></Suspense>}
