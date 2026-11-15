'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Search,X} from 'lucide-react';
const destinations=[
 {title:'Início',href:'/',detail:'Painel e indicadores'},
 {title:'Agenda',href:'/agenda/reservas',detail:'Reservas e cúpulas'},
 {title:'Clientes',href:'/clientes',detail:'Escolas e instituições'},
 {title:'Comercial',href:'/operacoes',detail:'Propostas, contratos e eventos'},
 {title:'Financeiro',href:'/financeiro',detail:'Extrato e gestão'},
 {title:'Contas a receber',href:'/financeiro/receber',detail:'Títulos e recebimentos'},
 {title:'Educacional',href:'/educacional',detail:'Alunos, turmas e professores'},
 {title:'Fidelização',href:'/fidelizacao',detail:'Lembretes e relacionamento'},
 {title:'Equipe',href:'/equipe',detail:'Colaboradores e convites'},
 {title:'Minha Empresa',href:'/configuracoes/prestador',detail:'Dados do planetário'},
 {title:'Vitrine Kids',href:'/vitrine',detail:'Página de apresentações'},
 {title:'Leads da vitrine',href:'/vitrine/inbox',detail:'Solicitações recebidas'},
 {title:'Intelligence',href:'/intelligence',detail:'Relatórios e apoio à decisão'},
];
export default function DashboardSearch({onHome}:{onHome:()=>void}){
 const [opened,setOpened]=useState(false);
 const [value,setValue]=useState('');
 const filtered=destinations.filter(item=>(item.title+' '+item.detail).toLocaleLowerCase('pt-BR').includes(value.toLocaleLowerCase('pt-BR'))).slice(0,9);
 return <div className="dashboard-search">
   <button type="button" className="icon-button" aria-label="Pesquisar funcionalidades" aria-expanded={opened} onClick={()=>setOpened(x=>!x)}><Search size={19}/></button>
   {opened&&<div className="dashboard-search-popover"><div className="dashboard-search-title"><strong>Encontrar uma função</strong><button type="button" onClick={()=>setOpened(false)} aria-label="Fechar pesquisa"><X size={17}/></button></div><label className="dashboard-search-label">Pesquisar no CRM<input autoFocus value={value} onChange={e=>setValue(e.target.value)} placeholder="Ex.: contratos, clientes, relatórios"/></label><div className="dashboard-search-results">{filtered.map(item=><Link key={item.href} href={item.href} onClick={()=>{if(item.href==='/')onHome();setOpened(false)}}><strong>{item.title}</strong><small>{item.detail}</small></Link>)}{filtered.length===0&&<p>Nenhuma função encontrada.</p>}</div><p className="dashboard-search-note">Busca por módulos e funcionalidades, não pelo conteúdo dos clientes.</p></div>}
 </div>;
}
