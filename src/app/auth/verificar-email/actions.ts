'use server';
import { auth } from '@/lib/auth/server';

type State = { ok?: boolean; error?: string } | null;

export async function enviarCodigo(_prev: State, data: FormData): Promise<State> {
  const email = String(data.get('email') || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Informe um e-mail válido.' };
  try {
    const result = await auth.emailOtp.sendVerificationOtp({ email, type: 'email-verification' });
    if (result.error) return { error: 'Não foi possível enviar o código. Verifique a configuração do Neon Auth.' };
    return { ok: true };
  } catch { return { error: 'Falha ao solicitar o código. Tente novamente mais tarde.' }; }
}

export async function confirmarCodigo(_prev: State, data: FormData): Promise<State> {
  const email = String(data.get('email') || '').trim().toLowerCase();
  const otp = String(data.get('otp') || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(otp)) return { error: 'Confira o e-mail e o código de seis dígitos.' };
  try {
    const result = await auth.emailOtp.verifyEmail({ email, otp });
    if (result.error) return { error: 'Código inválido ou expirado. Solicite outro se necessário.' };
    return { ok: true };
  } catch { return { error: 'Não foi possível confirmar o código. Tente novamente.' }; }
}
