'use server';
import { auth } from '@/lib/auth/server';
import { requireMember } from '@/lib/equipe/auth';

type PasswordState = { ok?: boolean; error?: string } | null;

export async function alterarMinhaSenha(_previous: PasswordState, form: FormData): Promise<PasswordState> {
  const member = await requireMember();
  if (!member) return { error: 'Acesso não autorizado.' };
  const currentPassword = String(form.get('currentPassword') || '');
  const newPassword = String(form.get('newPassword') || '');
  const confirm = String(form.get('confirmPassword') || '');
  if (!currentPassword || newPassword.length < 8 || newPassword.length > 128)
    return { error: 'A nova senha deve ter de 8 a 128 caracteres.' };
  if (newPassword !== confirm) return { error: 'As senhas não coincidem.' };
  if (currentPassword === newPassword) return { error: 'Escolha uma senha diferente da atual.' };
  try {
    const result = await auth.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    if (result.error) return { error: 'Não foi possível alterar. Confira sua senha atual.' };
    return { ok: true };
  } catch {
    return { error: 'Serviço de senha indisponível. Tente novamente.' };
  }
}
