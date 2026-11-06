'use client';
import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole } from 'lucide-react';
import '../sign-in/login.css';
function Formulario(){
 const search=useSearchParams(); const token=search.get('token'); const [password,setPassword]=useState(''); const [repeat,setRepeat]=useState(''); const [loading,setLoading]=useState(false); const [message,setMessage]=useState(''); const [done,setDone]=useState(false); const [showPassword,setShowPassword]=useState(false); const [showRepeat,setShowRepeat]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault(); if(!token||loading)return;
  if(password.length<12){setMessage('Utilize uma senha com pelo menos 12 caracteres.');return}
  if(password!==repeat){setMessage('As senhas não coincidem.');return}
  setLoading(true);setMessage('');
  try {
   const res=await fetch('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({token,newPassword:password})});
   if(!res.ok){setMessage('Não foi possível redefinir. O link pode ter expirado ou o serviço não está configurado.');return}
   setDone(true);setPassword('');setRepeat(''); setMessage('Senha redefinida. Agora faça login.');
  }catch{setMessage('Falha de comunicação. Tente novamente mais tarde.')}finally{setLoading(false)}
 }
 return <main className="antares-login-scene">
  <section className="antares-login-card" aria-labelledby="reset-title" style={{marginTop:0}}>
   <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
    {done?<CheckCircle2 size={24} color="#72f5c4" aria-hidden="true"/>:<KeyRound size={24} color="#66d6ff" aria-hidden="true"/>}
    <h1 id="reset-title" style={{margin:0}}>{done?'Senha atualizada!':'Criar nova senha'}</h1>
   </div>
   <p style={{color:'#d7e9ff',textAlign:'center',fontSize:15,lineHeight:1.5,margin:'4px 0 8px'}}>
    {done?'Sua senha foi alterada. Entre com a nova senha para acessar o ANTARES.': 'Escolha uma senha com pelo menos 12 caracteres.'}
   </p>
   {!token?<p role="alert" style={{color:'#fff',background:'#633047',padding:12,borderRadius:10}}>Link inválido. Solicite outro e-mail de recuperação.</p>:!done?
   <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:15}}>
    <label className="antares-login-field">
     <LockKeyhole size={20} aria-hidden="true"/>
     <span className="sr-only">Nova senha</span>
     <input type={showPassword?'text':'password'} autoComplete="new-password" placeholder="Nova senha" required minLength={12} value={password} onChange={e=>setPassword(e.target.value)} disabled={loading}/>
     <button type="button" aria-label={showPassword?'Ocultar nova senha':'Mostrar nova senha'} onClick={()=>setShowPassword(v=>!v)} style={{background:'transparent',border:0,color:'#c5e8ff',display:'grid',placeItems:'center',padding:4}}>{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button>
    </label>
    <label className="antares-login-field">
     <LockKeyhole size={20} aria-hidden="true"/>
     <span className="sr-only">Confirme a nova senha</span>
     <input type={showRepeat?'text':'password'} autoComplete="new-password" placeholder="Confirme a senha" required minLength={12} value={repeat} onChange={e=>setRepeat(e.target.value)} disabled={loading}/>
     <button type="button" aria-label={showRepeat?'Ocultar confirmação':'Mostrar confirmação'} onClick={()=>setShowRepeat(v=>!v)} style={{background:'transparent',border:0,color:'#c5e8ff',display:'grid',placeItems:'center',padding:4}}>{showRepeat?<EyeOff size={19}/>:<Eye size={19}/>}</button>
    </label>
    <button type="submit" className="antares-login-submit" disabled={loading}>{loading?'SALVANDO…':'SALVAR NOVA SENHA'}</button>
   </form>:null}
   {message&&!done&&<p role="alert" style={{border:'1px solid #ff9c9c',borderRadius:10,padding:12,fontSize:14,color:'#fff',background:'#63212a'}}>{message}</p>}
   <Link href={token?'/auth/sign-in':'/auth/esqueci-senha'} className="antares-login-forgot"><ArrowLeft size={18} aria-hidden="true"/>{token?'Voltar ao login':'Solicitar novo link'}</Link>
  </section>
 </main>;
}
export default function Page(){return <Suspense fallback={<p>Carregando…</p>}><Formulario/></Suspense>}
