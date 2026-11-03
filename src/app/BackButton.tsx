 'use client';
import {useRouter} from 'next/navigation';
import {ChevronLeft} from 'lucide-react';
export default function BackButton(){
 const router=useRouter();
 return <button type="button" className="owner-back-button" aria-label="Voltar para a página anterior" onClick={()=>{if(window.history.length>1)router.back();else router.replace('/');}}><ChevronLeft size={15}/> Voltar</button>;
}
