'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import '../auth/onboarding.css';

function ConviteFlow() {
  const search=useSearchParams();
  const token=search.get('token')||'';
  const valid=/^[a-f0-9]{64}$/.test(token);
  const query=valid?'?token='+encodeURIComponent(token):'';
  return <main className="antares-onboarding"><section className="onboard-card"><header className="onboard-header"><span className="onboard-eyebrow">ANTARES BUSINESS · EQUIPE</span>
    <h1>Bem-vindo à equipe ANTARES!</h1></header><div className="onboard-body">
    <p>Use o mesmo e-mail informado pelo responsável do planetário. O convite é válido por 48 horas.</p>
    <p><strong>Seu primeiro acesso em 3 etapas:</strong></p>
    <ol className="onboard-steps">
      <li>Criar sua conta e escolher uma senha.</li>
      <li>Confirmar o e-mail com o código recebido.</li>
      <li>Entrar e aceitar o convite. O painel abre após a validação.</li>
    </ol>
    {valid?<div className="onboard-actions">
      <a href={'/auth/primeiro-acesso'+query} className="onboard-button onboard-primary">Etapa 1 — Criar minha conta</a>
      <a href={'/auth/verificar-email'+query} className="onboard-button onboard-secondary">Etapa 2 — Confirmar meu e-mail</a>
      <a href={'/auth/sign-in'+query} className="onboard-button onboard-secondary">Etapa 3 — Entrar e aceitar convite</a>
    </div>:<div className="onboard-actions" role="status"><p>Abra o link de convite recebido do responsável para começar. Se já faz parte da equipe, entre normalmente.</p><a href="/auth/sign-in" className="onboard-button onboard-primary">Entrar na minha conta</a></div>}
    </div></section></main>;
}

export default function ConviteClient(){return <Suspense fallback={<p>Carregando convite...</p>}><ConviteFlow/></Suspense>}
