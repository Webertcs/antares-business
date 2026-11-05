'use server';
import { auth } from '@/lib/auth/server';
type State = { error?: string; ok?: boolean } | null;
export async function criarConta(_previous: State, form: FormData): Promise<State> {
 const name=String(form.get('name')||'').trim();
 const email=String(form.get('email')||'').trim().toLowerCase();
 const password=String(form.get('password')||'');
 const confirm=String(form.get('confirm')||'');
 if(name.length<2||name.length>120||!/^\S+@\S+\.\S+$/.test(email))return {error:'Confira o nome e o e-mail.'};
 if(password.length<12||password.length>128)return {error:'A senha precisa ter de 12 a 128 caracteres.'};
 if(password!==confirm)return {error:'As senhas não coincidem.'};
 try {
  const {error}=await auth.signUp.email({name,email,password});
  if(error)return {error:'Não foi possível criar a conta. Se você já tem cadastro, use Entrar ou Recuperar acesso.'};
  return {ok:true};
 }catch{return {error:'Serviço de cadastro indisponível. Tente novamente.'};}
}
