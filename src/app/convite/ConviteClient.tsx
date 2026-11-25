'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
function ConviteFlow() {
  const search=useSearchParams();
  const token=search.get('token')||'';
  const query=/^[a-f0-9]{64}$/.test(token)?'?token='+encodeURIComponent(token):'';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function accept() {
    setBusy(true); setMessage('');
    try {
      if(!/^[a-f0-9]{64}$/.test(token))throw new Error('Convite inválido. Solicite um novo link ao proprietário.');
      const result = await fetch('/api/equipe/convites/aceitar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }), cache: 'no-store'
      });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || 'Erro ao aceitar');
      setMessage('Tudo pronto! Seu convite foi aceito. Clique em Abrir painel do ANTARES para começar.');
      window.history.replaceState({}, '', '/convite');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Erro ao aceitar convite'); }
    finally { setBusy(false); }
  }
  return <main style={{maxWidth:520,margin:'12vh auto',padding:30,fontFamily:'system-ui'}}>
    <h1 style={{fontSize:27,fontWeight:750}}>Bem-vindo à equipe ANTARES!</h1>
    <p>Use o mesmo e-mail informado pelo responsável do planetário. O convite é válido por 48 horas.</p><p><strong>Seu primeiro acesso em 4 etapas:</strong></p><ol style={{listStyle:'decimal',paddingLeft:24,lineHeight:1.7}}><li>Criar sua conta e escolher uma senha.</li><li>Confirmar o e-mail com o código recebido.</li><li>Entrar com seu e-mail e sua senha.</li><li>Aceitar o convite e abrir o painel.</li></ol>
    <div style={{display:"grid",gap:12,margin:"20px 0"}}><a href={"/auth/primeiro-acesso"+query} style={{background:"#2563eb",color:"#fff",padding:13,borderRadius:9,textAlign:"center",fontWeight:700}}>Etapa 1 de 4 · Criar minha conta</a><a href={"/auth/sign-in"+query}>Já tenho conta · Ir para a etapa 3</a><a href={"/auth/verificar-email"+query}>Já criei minha conta · Confirmar e-mail (etapa 2)</a></div><p><strong>Etapa 4 de 4 — Aceitar convite</strong></p><p>Já confirmou seu e-mail e entrou na sua conta? Clique abaixo para liberar seu acesso à equipe. Após o login, você retorna a esta página automaticamente.</p>
    <button disabled={busy} onClick={accept} style={{background:'#2563eb',padding:12,borderRadius:8,color:'#fff'}}>{busy?'Verificando...':'4. Aceitar convite e liberar acesso'}</button>
    {message && <p role="status">{message}</p>}
    <p><a href="/">Abrir painel do ANTARES</a></p>
  </main>;
}

export default function ConviteClient(){return <Suspense fallback={<p>Carregando convite...</p>}><ConviteFlow/></Suspense>}
