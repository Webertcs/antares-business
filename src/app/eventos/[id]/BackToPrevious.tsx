'use client';
import {useRouter} from 'next/navigation';

export default function BackToPrevious(){
 const router=useRouter();
 return <button type="button"
  onClick={()=>{if(window.history.length>1)router.back();else router.push('/eventos');}}
  style={{border:0,background:'transparent',padding:0,color:'#195db3',fontSize:13,fontWeight:750,cursor:'pointer',textAlign:'left'}}>
   ← Voltar à página anterior
 </button>;
}
