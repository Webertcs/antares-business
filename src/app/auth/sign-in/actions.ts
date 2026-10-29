"use server";
import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
export async function signInAction(_previous: { error: string } | null, form: FormData) {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { error: 'Informe e-mail e senha.' };
  try {
    const { error } = await auth.signIn.email({ email, password });
    if (error) return { error: 'Não foi possível entrar. Confira seus dados e a verificação do e-mail.' };
  } catch { return { error: 'Falha no serviço de autenticação.' }; }
  redirect('/');
}
