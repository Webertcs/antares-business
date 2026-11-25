'use client';
import {Suspense,useActionState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {criarConta} from './actions';
import '../onboarding.css';
const field={display:'block',width:'100%',padding:12,border:'1px solid #a8bde1',borderRadius:9,background:'#fff',color:'#102b55',marginTop:5} as const;
function Form(){
 const search=useSearchParams();const token=search.get('token')||'';
 const valid=/^[a-f0-9]{64}$/.test(token);
 const next=valid?'/convite?token='+encodeURIComponent(token):'/auth/sign-in';
 const [state,action,pending]=useActionState(criarConta,null);
 return <main className="antares-onboarding">
 <section className="onboard-card">
 <header className="onboard-header"><small className="onboard-eyebrow">ANTARES BUSINESS · EQUIPE</small><h1>Meu primeiro acesso</h1><p>{valid?'Etapa 1 de 3 — Crie sua conta.':'Crie sua conta para entrar no planetário.'}</p></header>
 <div className="onboard-body">
 {!valid&&<div role="status" style={{padding:14,borderRadius:10,background:'#eff6ff',color:'#174985',lineHeight:1.6}}><p>O primeiro acesso de colaboradores exige um convite enviado pelo proprietário.</p><div className="onboard-actions"><Link href="/auth/esqueci-senha" className="onboard-button onboard-secondary">Definir ou recuperar senha</Link></div></div>}
 {state?.ok?<div role="status"><h2 className="onboard-success">✓ Etapa 1 concluída!</h2><p>Sua conta foi criada. Agora confirme seu e-mail com o código recebido. Confira também a pasta de spam. Na última etapa, entre com sua senha para aceitar o convite e abrir o painel.</p><div className="onboard-actions"><Link href={'/auth/verificar-email?token='+encodeURIComponent(token)} className="onboard-button onboard-primary">Ir para etapa 2 — Confirmar meu e-mail</Link><Link href={'/auth/sign-in?token='+encodeURIComponent(token)} className="onboard-button onboard-secondary">Já confirmei meu e-mail — Etapa 3</Link></div></div>:valid?
 <form action={action} style={{display:'grid',gap:14}}><p>Use o mesmo e-mail informado no convite. Crie uma senha de pelo menos 8 caracteres. Você usará esses dados para entrar no ANTARES.</p>
 <label>Nome completo<input name="name" required minLength={2} maxLength={120} autoComplete="name" style={field}/></label>
 <label>E-mail informado no convite<input name="email" type="email" required autoComplete="email" style={field}/></label>
 <label>Crie uma senha (mínimo de 8 caracteres)<input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" style={field}/></label>
 <label>Confirme a senha<input name="confirm" type="password" required minLength={8} maxLength={128} autoComplete="new-password" style={field}/></label>
 {state?.error&&<p role="alert" style={{color:'#b91c1c'}}>{state.error}</p>}
 <button disabled={pending||!valid} className="onboard-button onboard-primary">{pending?'Criando conta...':'Criar conta e continuar'}</button>
 </form>:null}
 <div className="onboard-actions onboard-footer"><Link href={'/auth/sign-in?token='+encodeURIComponent(token)} className="onboard-button onboard-secondary">Já possuo conta — Entrar</Link><Link href={next} className="onboard-button onboard-tertiary">{valid?'Voltar ao convite':'Voltar ao login'}</Link></div>
 </div></section></main>;
}
export default function Page(){return <Suspense fallback={<p>Carregando…</p>}><Form/></Suspense>}
