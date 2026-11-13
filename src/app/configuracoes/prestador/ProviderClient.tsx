'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {Building2,CheckCircle2,Save,ShieldCheck} from 'lucide-react';

type Profile={name:string;document:string;phone:string;address:string;representative:string};
type Field=keyof Profile;
const blank:Profile={name:'',document:'',phone:'',address:'',representative:''};
const digits=(v:string)=>v.replace(/\D/g,'');

function maskDocument(raw:string){
 const value=digits(raw);
 if(value.length>14)return raw; // Preserva visualmente valores de testes antigos sem truncar.
 if(value.length<=11){
  const d=value.slice(0,11);
  return [d.slice(0,3),d.length>3?'.'+d.slice(3,6):'',d.length>6?'.'+d.slice(6,9):'',d.length>9?'-'+d.slice(9,11):''].join('');
 }
 const d=value.slice(0,14);
 return d.slice(0,2)+'.'+d.slice(2,5)+'.'+d.slice(5,8)+'/'+d.slice(8,12)+(d.length>12?'-'+d.slice(12,14):'');
}
function maskPhone(raw:string){
 const d=digits(raw).slice(0,11);
 if(!d)return '';
 if(d.length<=2)return '('+d+(d.length===2?') ':'');
 const local=d.slice(2);
 const cut=d.length===11?5:4;
 return '('+d.slice(0,2)+') '+local.slice(0,cut)+(local.length>cut?'-'+local.slice(cut):'');
}
const fields:{key:Field;label:string;long?:boolean;max:number;placeholder?:string}[]=[
 {key:'name',label:'Razão social / Nome',long:true,max:180},
 {key:'document',label:'CPF ou CNPJ',max:20,placeholder:'000.000.000-00 ou 00.000.000/0000-00'},
 {key:'phone',label:'Telefone de contato',max:15,placeholder:'(61) 92546-XXXX'},
 {key:'address',label:'Endereço da empresa',long:true,max:300},
 {key:'representative',label:'Representante',long:true,max:180},
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
   .then(d=>{
    if(!active)return;
    if(d.profile)setForm({
     name:d.profile.name||'',
     document:maskDocument(d.profile.document||''),
     phone:maskPhone(d.profile.phone||''),
     address:d.profile.address||'',
     representative:d.profile.representative||'',
    });
    setMessage(d.profile?'':'Nenhum dado da empresa cadastrado.');
    setNoticeType('info');
   })
   .catch(e=>{if(active){setMessage(e instanceof Error?e.message:'Não foi possível carregar os dados.');setNoticeType('error');}});
  return()=>{active=false};
 },[]);
 function onFieldChange(key:Field,value:string){
  const next=key==='document'?maskDocument(value):key==='phone'?maskPhone(value):value;
  setForm(v=>({...v,[key]:next}));
  if(message&&noticeType!=='info'){setMessage('');setNoticeType('info');}
 }
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!enabled||busy)return;
  const d=digits(form.document),p=digits(form.phone);
  if(d.length!==11&&d.length!==14){
   setNoticeType('error');setMessage('Informe CPF com 11 dígitos ou CNPJ com 14 dígitos.');return;
  }
  if(p.length!==10&&p.length!==11){
   setNoticeType('error');setMessage('Informe telefone com DDD e 10 ou 11 dígitos.');return;
  }
  setBusy(true);setMessage('');
  try{
   const payload={...form,document:maskDocument(form.document),phone:maskPhone(form.phone)};
   const r=await fetch('/api/configuracoes/prestador',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const data=await r.json();if(!r.ok)throw Error(data.error||'Erro ao salvar');
   const verify=await fetch('/api/configuracoes/prestador',{cache:'no-store'});
   const current=await verify.json();
   if(!verify.ok||!current.profile||(['name','document','phone','address','representative'] as const).some(k=>String(current.profile[k]||'').trim()!==payload[k].trim()))
    throw Error('A conferência de leitura não confirmou todos os campos. Confira os dados antes de tentar novamente.');
   setForm(payload);
   setMessage('Dados da empresa, CPF/CNPJ e telefone salvos e conferidos com sucesso.');
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
   {message&&<p role="status" aria-live="polite" className={'antares-provider-status antares-provider-status--'+noticeType}>{noticeType==='success'&&<CheckCircle2 size={16}/>} {message}</p>}
   <form onSubmit={save} className="antares-provider-form" aria-busy={busy}>
    {fields.map(({key,label,long,max,placeholder})=><label className={long?'antares-provider-field antares-provider-field--wide':'antares-provider-field'} key={key} htmlFor={'provider-'+key}>
     <span>{label}</span>
     <input id={'provider-'+key} required maxLength={max} placeholder={placeholder} inputMode={key==='phone'||key==='document'?'numeric':undefined} autoComplete={key==='name'?'organization':key==='address'?'street-address':key==='phone'?'tel':'off'} value={form[key]} disabled={!enabled||busy} onChange={e=>onFieldChange(key,e.target.value)}/>
    </label>)}
    {enabled&&<div className="antares-provider-actions"><button type="submit" disabled={busy} className="antares-provider-save"><Save size={17}/>{busy?'Salvando...':'Salvar dados da empresa'}</button></div>}
   </form>
  </section>
 </section>;
}
