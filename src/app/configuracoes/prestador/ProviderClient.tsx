'use client';
import {useEffect,useState} from 'react';import Link from 'next/link';
type Profile={name:string;document:string;address:string;representative:string};
const blank:Profile={name:'',document:'',address:'',representative:''};
export default function ProviderClient({enabled}:{enabled:boolean}){
 const [form,setForm]=useState<Profile>(blank),[message,setMessage]=useState('Consultando dados da empresa...'),[busy,setBusy]=useState(false);
 useEffect(()=>{fetch('/api/configuracoes/prestador',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Indisponível');return d;}).then(d=>{if(d.profile)setForm(d.profile);setMessage(d.profile?'Dados cadastrados encontrados.':'Nenhum dado do prestador cadastrado.');}).catch(e=>setMessage(e.message));},[]);
 async function save(e:React.FormEvent){e.preventDefault();if(!enabled||busy)return;setBusy(true);setMessage('');
 try{const r=await fetch('/api/configuracoes/prestador',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});const d=await r.json();if(!r.ok)throw Error(d.error||'Erro ao salvar');setMessage('Dados do prestador salvos para os próximos documentos.');}
 catch(e){setMessage(e instanceof Error?e.message:'Falha');}finally{setBusy(false);}}
 return <main style={{maxWidth:850,margin:'20px auto',padding:24,color:'#16345c',fontFamily:'system-ui'}}>
 <Link href="/">← Painel</Link><h1>Dados do prestador</h1><p>Identificação da empresa para propostas comerciais e minutas de contrato.</p>
 {!enabled&&<p style={{padding:14,background:'#fff0d5',borderRadius:8}}>Gravação bloqueada durante homologação. O cadastro definitivo só poderá ser salvo após autorização.</p>}
 <p role="status">{message}</p><form onSubmit={save} style={{display:'grid',gap:16}}>
 {([['name','Razão social / nome'],['document','CPF ou CNPJ'],['address','Endereço do prestador'],['representative','Representante']] as const).map(([key,label])=>
 <label key={key}>{label}<input required maxLength={key==='address'?300:180} value={form[key]} disabled={!enabled} onChange={e=>setForm(v=>({...v,[key]:e.target.value}))}
 style={{display:'block',width:'100%',marginTop:5,padding:12,border:'1px solid #b5c7df',borderRadius:8}}/></label>)}
 {enabled&&<button disabled={busy} style={{padding:13,border:0,borderRadius:8,color:'white',background:'#2459c5'}}>{busy?'Salvando...':'Salvar dados da empresa'}</button>}
 </form><p style={{fontSize:13,marginTop:16}}>As informações salvas serão carregadas automaticamente no documento. Não incluem assinatura digital ou comprovação de aceite.</p>
 </main>;
}
