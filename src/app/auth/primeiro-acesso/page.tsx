'use client';
import {Suspense,useActionState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {criarConta} from './actions';
const field={display:'block',width:'100%',padding:12,border:'1px solid #a8bde1',borderRadius:9,background:'#fff',color:'#102b55',marginTop:5} as const;
function Form(){
 const search=useSearchParams();const token=search.get('token')||'';
 const valid=/^[a-f0-9]{64}$/.test(token);
 const next=valid?'/convite?token='+encodeURIComponent(token):'/auth/sign-in';
 const [state,action,pending]=useActionState(criarConta,null);
 return <main style={{minHeight:'100vh',background:'linear-gradient(135deg,#e8f1ff,#f8fbff)',padding:'7vh 16px',color:'#102b55'}}>
 <section style={{maxWidth:490,margin:'auto',borderRadius:18,overflow:'hidden',background:'#fff',boxShadow:'0 16px 40px #123c8026'}}>
 <header style={{padding:26,background:'linear-gradient(110deg,#12366d,#2778ec)',color:'#fff'}}><small>ANTARES BUSINESS · EQUIPE</small><h1 style={{fontSize:27,fontWeight:800,marginTop:10}}>Meu primeiro acesso</h1><p>{valid?'Etapa 1 de 4 — Crie sua conta.':'Crie sua conta para entrar no planetário.'}</p></header>
 <div style={{padding:26}}>
 {!valid&&<div role="status" style={{padding:14,borderRadius:10,background:'#eff6ff',color:'#174985',lineHeight:1.6}}><p>O primeiro acesso de colaboradores exige um convite enviado pelo proprietário.</p><p style={{marginTop:10}}>Já possui cadastro? <Link href="/auth/esqueci-senha" style={{fontWeight:750,textDecoration:'underline'}}>Definir ou recuperar senha</Link>.</p></div>}
 {state?.ok?<div role="status"><h2 style={{fontWeight:750,fontSize:20}}>Etapa 1 concluída!</h2><p>Sua conta foi criada. Agora confirme seu e-mail com o código recebido. Confira também a pasta de spam. Depois, faça login e aceite o convite.</p><p style={{marginTop:15}}><Link href={'/auth/verificar-email?token='+encodeURIComponent(token)} style={{color:'#1d4ed8'}}>Continuar para a etapa 2 · Confirmar meu e-mail</Link></p><p style={{marginTop:15}}><Link href={'/auth/sign-in?token='+encodeURIComponent(token)} style={{color:'#1d4ed8'}}>Já confirmei meu e-mail · Ir para a etapa 3</Link></p></div>:valid?
 <form action={action} style={{display:'grid',gap:14}}><p>Use o mesmo e-mail informado no convite. Crie uma senha de pelo menos 8 caracteres. Você usará esses dados para entrar no ANTARES.</p>
 <label>Nome completo<input name="name" required minLength={2} maxLength={120} autoComplete="name" style={field}/></label>
 <label>E-mail informado no convite<input name="email" type="email" required autoComplete="email" style={field}/></label>
 <label>Crie uma senha (mínimo de 8 caracteres)<input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" style={field}/></label>
 <label>Confirme a senha<input name="confirm" type="password" required minLength={8} maxLength={128} autoComplete="new-password" style={field}/></label>
 {state?.error&&<p role="alert" style={{color:'#b91c1c'}}>{state.error}</p>}
 <button disabled={pending||!valid} style={{background:'#2463e7',color:'white',padding:13,borderRadius:10,fontWeight:700,cursor:'pointer',opacity:pending||!valid?.6:1}}>{pending?'Criando conta...':'Criar conta e continuar'}</button>
 </form>:null}
 <p style={{marginTop:18}}>Já possui conta? <Link href={'/auth/sign-in?token='+encodeURIComponent(token)} style={{color:'#1d4ed8'}}>Entrar</Link></p>
 <p style={{marginTop:10}}><Link href={next} style={{color:'#1d4ed8'}}>Voltar ao convite</Link></p>
 </div></section></main>;
}
export default function Page(){return <Suspense fallback={<p>Carregando…</p>}><Form/></Suspense>}
