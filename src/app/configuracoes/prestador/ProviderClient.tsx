'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {Building2,CheckCircle2,Save,ShieldCheck} from 'lucide-react';

type Profile={name:string;document:string;address:string;representative:string};
type Field=keyof Profile;
const blank:Profile={name:'',document:'',address:'',representative:''};
const fields:{key:Field;label:string;long?:boolean;max:number}[]=[
 {key:'name',label:'Razão social / Nome',long:true,max:180},
 {key:'document',label:'CPF ou CNPJ',max:180},
 {key:'representative',label:'Representante',max:180},
 {key:'address',label:'Endereço da empresa',long:true,max:300},
];

export default function ProviderClient({enabled}:{enabled:boolean}){
 const [form,setForm]=useState<Profile>(blank);
 const [message,setMessage]=useState('Consultando os dados da empresa...');
 const [noticeType,setNoticeType]=useState<'info'|'success'|'error'>('info');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  let active=true;
  fetch('/api/configuracoes/prestador',{cache:'no-store'})
   .then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Indisponível');return d;})
   .then(d=>{if(!active)return;if(d.profile)setForm(d.profile);setMessage(d.profile?'':'Nenhum dado da empresa cadastrado.');setNoticeType('info');})
   .catch(e=>{if(active){setMessage(e instanceof Error?e.message:'Não foi possível carregar os dados.');setNoticeType('error');}});
  return()=>{active=false};
 },[]);
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!enabled||busy)return;
  setBusy(true);setMessage('');
  try{
   const r=await fetch('/api/configuracoes/prestador',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
   const d=await r.json();
   if(!r.ok)throw Error(d.error||'Erro ao salvar');
   const verify=await fetch('/api/configuracoes/prestador',{cache:'no-store'});
   const current=await verify.json();
   if(!verify.ok||!current.profile||(['name','document','address','representative'] as const).some(k=>current.profile[k]!==form[k].trim()))throw Error('O salvamento não foi confirmado por nova leitura. Confira os dados antes de tentar novamente.');
   setMessage('Dados da empresa salvos e conferidos com sucesso.');
   setNoticeType('success');
  }catch(e){setMessage(e instanceof Error?e.message:'Falha ao salvar.');setNoticeType('error');}
  finally{setBusy(false);}
 }
 return <section className="antares-provider-page">
  <header className="antares-provider-hero">
   <div className="antares-provider-hero-icon"><Building2 size={26}/></div>
   <div><span className="antares-provider-eyebrow">ANTARES BUSINESS · CONFIGURAÇÕES</span><h1>Dados da empresa</h1><p>Informações para propostas e contratos.</p></div>
  </header>
  <section className="antares-provider-card">
   <header className="antares-provider-card-header">
    <div><h2>Identificação da empresa</h2><p>Dados do responsável pelo planetário.</p></div>
    <ShieldCheck size={21} aria-hidden="true"/>
   </header>
   {!enabled&&<p className="antares-provider-status antares-provider-status--info">Edição indisponível no momento. Os dados continuam disponíveis para consulta.</p>}
   {message&&<p role="status" aria-live="polite" className={`antares-provider-status antares-provider-status--${noticeType}`}>{noticeType==='success'&&<CheckCircle2 size={16}/>} {message}</p>}
   <form onSubmit={save} className="antares-provider-form" aria-busy={busy}>
    {fields.map(({key,label,long,max})=><label className={long?'antares-provider-field antares-provider-field--wide':'antares-provider-field'} key={key} htmlFor={`provider-${key}`}>
     <span>{label}</span>
     <input id={`provider-${key}`} required maxLength={max} value={form[key]} disabled={!enabled||busy} onChange={e=>setForm(v=>({...v,[key]:e.target.value}))} autoComplete={key==='name'?'organization':key==='address'?'street-address':'off'}/>
    </label>)}
    {enabled&&<div className="antares-provider-actions"><button type="submit" disabled={busy} className="antares-provider-save"><Save size={17}/>{busy?'Salvando...':'Salvar dados da empresa'}</button></div>}
   </form>
  </section>
 </section>;
}
