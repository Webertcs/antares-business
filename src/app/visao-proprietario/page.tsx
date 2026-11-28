import { redirect } from 'next/navigation';
import { requireDeveloper } from '@/lib/equipe/auth';
export const dynamic='force-dynamic';
// A prévia comercial foi retirada: o painel técnico não imita o proprietário.
export default async function Page(){
  if(!await requireDeveloper())redirect('/sem-acesso');
  redirect('/oficina');
}
