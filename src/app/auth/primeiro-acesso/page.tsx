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
 <header style={{padding:26,background:'linear-gradient(110deg,#12366d,#2778ec)',color:'#fff'}}><small>ANTARES BUSINESS · EQUIPE</small><h1 style={{fontSize:27,fontWeight:800,marginTop:10}}>Meu primeiro acesso</h1><p>Crie sua conta para entrar no planetário.</p></header>
 <div style={{padding:26}}>
 {!valid&&<p role="alert" style={{color:'#b45309'}}>Abra esta página pelo link de convite recebido do proprietário.</p>}
 {state?.ok?<div role="status"><h2 style={{fontWeight:750,fontSize:20}}>Conta criada!</h2><p>Confirme seu e-mail, se solicitado pelo serviço de autenticação. Depois entre com sua nova senha e volte ao convite para concluir a autorização.</p><p style={{marginTop:15}}><Link href={'/auth/verificar-email?token='+encodeURIComponent(token)} style={{color:'#1d4ed8'}}>Confirmar meu e-mail</Link></p><p style={{marginTop:15}}><Link href={'/auth/sign-in?token='+encodeURIComponent(token)} style={{color:'#1d4ed8'}}>Entrar com minha conta</Link></p></div>:
 <form action={action} style={{display:'grid',gap:14}}>
 <label>Nome completo<input name="name" required minLength={2} maxLength={120} autoComplete="name" style={field}/></label>
 <label>E-mail que recebeu o convite<input name="email" type="email" required autoComplete="email" style={field}/></label>
 <label>Crie uma senha (mínimo de 12 caracteres)<input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" style={field}/></label>
 <label>Confirme a senha<input name="confirm" type="password" required minLength={12} maxLength={128} autoComplete="new-password" style={field}/></label>
 {state?.error&&<p role="alert" style={{color:'#b91c1c'}}>{state.error}</p>}
 <button disabled={pending||!valid} style={{background:'#2463e7',color:'white',padding:13,borderRadius:10,fontWeight:700,cursor:'pointer',opacity:pending||!valid?.6:1}}>{pending?'Criando conta...':'Criar meu acesso'}</button>
 </form>}
 <p style={{marginTop:18}}>Já possui conta? <Link href={'/auth/sign-in?token='+encodeURIComponent(token)} style={{color:'#1d4ed8'}}>Entrar</Link></p>
 <p style={{marginTop:10}}><Link href={next} style={{color:'#1d4ed8'}}>Voltar ao convite</Link></p>
 </div></section></main>;
}
export default function Page(){return <Suspense fallback={<p>Carregando…</p>}><Form/></Suspense>}
