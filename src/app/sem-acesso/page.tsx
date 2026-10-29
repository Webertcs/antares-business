import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page(){
 const {data:session}=await auth.getSession();
 if(!session?.user) redirect('/auth/sign-in');
 return <main style={{padding:48,maxWidth:700,margin:'auto'}}><h1>Acesso pendente de aprovação</h1><p>Sua conta foi autenticada, mas não está vinculada a uma equipe ativa. Solicite autorização ao proprietário.</p><a href="/vitrine">Visitar vitrine pública</a></main>;
}
