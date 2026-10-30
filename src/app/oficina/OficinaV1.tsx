'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {CalendarDays,ClipboardList,FileText,GraduationCap,HandCoins,HeartHandshake,LayoutDashboard,Presentation,Settings,ShieldCheck,Users,Wallet,Globe,Download,Plus,Trash2,Search} from 'lucide-react';
type Row={id:string;[key:string]:string};
type Module='visao'|'clientes'|'contatos'|'professores'|'propostas'|'contratos'|'agenda'|'cupulas'|'financeiro'|'fidelizacao'|'equipe'|'relatorios'|'vitrine'|'ajustes';
type Def={title:string;description:string;fields:{key:string;label:string;type?:string;options?:string[]}[]};
const defs:Record<Exclude<Module,'visao'|'relatorios'|'vitrine'>,Def>={
 clientes:{title:'Clientes e instituições',description:'Escolas, empresas, associações e eventos particulares',fields:[{key:'name',label:'Nome / razão social'},{key:'type',label:'Tipo',options:['Escola','Empresa','Associação','Particular']},{key:'city',label:'Cidade'},{key:'phone',label:'Telefone'},{key:'email',label:'E-mail',type:'email'},{key:'status',label:'Situação',options:['Ativo','Prospecto','Arquivado']}]},
 contatos:{title:'Contatos',description:'Responsáveis e referências comerciais das instituições',fields:[{key:'name',label:'Nome completo'},{key:'client',label:'Cliente vinculado'},{key:'role',label:'Cargo / função'},{key:'phone',label:'WhatsApp / telefone'},{key:'email',label:'E-mail',type:'email'}]},
 professores:{title:'Professores e escolas',description:'Relacionamento com educadores e turmas',fields:[{key:'name',label:'Professor(a)'},{key:'school',label:'Escola'},{key:'classroom',label:'Turma / série'},{key:'phone',label:'Contato'},{key:'note',label:'Observações'}]},
 propostas:{title:'Propostas e orçamentos',description:'Valores por aluno ou preço fechado e acompanhamento de negociação',fields:[{key:'name',label:'Nome da proposta'},{key:'client',label:'Cliente'},{key:'mode',label:'Forma de cobrança',options:['Por aluno','Preço fechado','Gratuito']},{key:'qty',label:'Quantidade de alunos',type:'number'},{key:'unit',label:'Valor por aluno (R$)',type:'number'},{key:'fixed',label:'Preço fechado (R$)',type:'number'},{key:'discount',label:'Desconto (R$)',type:'number'},{key:'deposit',label:'Sinal (R$)',type:'number'},{key:'status',label:'Etapa',options:['Rascunho','Enviada','Negociação','Aceita','Recusada']}]},
 contratos:{title:'Contratos e confirmações',description:'Formal, verbal ou WhatsApp; vinculado à proposta',fields:[{key:'name',label:'Identificação'},{key:'proposal',label:'Proposta vinculada'},{key:'mode',label:'Modalidade',options:['Formal','Verbal','WhatsApp']},{key:'status',label:'Situação',options:['Pendente','Confirmado','Cumprido','Cancelado']},{key:'terms',label:'Condições'}]},
 agenda:{title:'Agenda de apresentações',description:'Datas e horários com separação por cúpula e organização',fields:[{key:'name',label:'Apresentação'},{key:'client',label:'Cliente'},{key:'dome',label:'Cúpula'},{key:'start',label:'Início',type:'datetime-local'},{key:'end',label:'Término',type:'datetime-local'},{key:'students',label:'Participantes',type:'number'},{key:'status',label:'Situação',options:['Reservada','Confirmada','Realizada','Cancelada']}]},
 cupulas:{title:'Cúpulas e equipamentos',description:'Inventário, lotação e disponibilidade',fields:[{key:'name',label:'Nome da cúpula'},{key:'capacity',label:'Capacidade',type:'number'},{key:'equipment',label:'Equipamentos'},{key:'status',label:'Situação',options:['Disponível','Manutenção','Inativa']}]},
 financeiro:{title:'Financeiro e extrato',description:'Receitas, despesas e separação entre previsão e realização',fields:[{key:'name',label:'Descrição'},{key:'category',label:'Natureza',options:['Receita','Despesa']},{key:'amount',label:'Valor (R$)',type:'number'},{key:'date',label:'Data',type:'date'},{key:'status',label:'Situação',options:['Previsto','Liquidado']},{key:'proposal',label:'Proposta vinculada'}]},
 fidelizacao:{title:'Fidelização',description:'Benefícios, frequência das visitas e regras aprovadas',fields:[{key:'name',label:'Campanha / benefício'},{key:'client',label:'Cliente'},{key:'threshold',label:'Visitas necessárias',type:'number'},{key:'discount',label:'Desconto (%)',type:'number'},{key:'status',label:'Situação',options:['Planejado','Ativo','Encerrado']}]},
 equipe:{title:'Equipe e permissões',description:'Estrutura visual de colaboradores e papéis, sem conceder acesso real',fields:[{key:'name',label:'Colaborador'},{key:'role',label:'Papel',options:['Proprietário','Colaborador']},{key:'email',label:'E-mail',type:'email'},{key:'status',label:'Situação',options:['Convite pendente','Ativo','Suspenso']}]},
 ajustes:{title:'Configurações',description:'Identidade e parâmetros operacionais do planetário',fields:[{key:'name',label:'Nome do planetário'},{key:'whatsapp',label:'WhatsApp comercial'},{key:'email',label:'E-mail de contato',type:'email'},{key:'brand',label:'Nome da marca na vitrine'},{key:'region',label:'Região de atendimento'}]}
};
const names:Record<Module,string>={visao:'Visão geral',clientes:'Clientes',contatos:'Contatos',professores:'Professores',propostas:'Propostas',contratos:'Contratos',agenda:'Agenda',cupulas:'Cúpulas',financeiro:'Financeiro',fidelizacao:'Fidelização',equipe:'Equipe',relatorios:'Relatórios',vitrine:'Vitrine Kids',ajustes:'Configurações'};
const groups:{label:string;items:{id:Module;icon:typeof Users}[]}[]=[
 {label:'Gestão',items:[{id:'visao',icon:LayoutDashboard},{id:'clientes',icon:Users},{id:'contatos',icon:Users},{id:'professores',icon:GraduationCap}]},
 {label:'Comercial e operação',items:[{id:'propostas',icon:FileText},{id:'contratos',icon:ClipboardList},{id:'agenda',icon:CalendarDays},{id:'cupulas',icon:Presentation}]},
 {label:'Administração',items:[{id:'financeiro',icon:Wallet},{id:'fidelizacao',icon:HeartHandshake},{id:'equipe',icon:ShieldCheck},{id:'relatorios',icon:HandCoins},{id:'vitrine',icon:Globe},{id:'ajustes',icon:Settings}]}
];
const initial=Object.fromEntries(Object.keys(names).map(k=>[k,[] as Row[]])) as unknown as Record<Module,Row[]>;
const relations:Partial<Record<Module,Record<string,Module>>>={contatos:{client:'clientes'},professores:{school:'clientes'},propostas:{client:'clientes'},contratos:{proposal:'propostas'},agenda:{client:'clientes',dome:'cupulas'},financeiro:{proposal:'propostas'},fidelizacao:{client:'clientes'}};
const relationLabel=(module:Module,key:string,row:Row,records:Record<Module,Row[]>)=>{
 const target=relations[module]?.[key];return target?records[target].find(x=>x.id===row[key])?.name||'Vínculo não encontrado':row[key]||'';
};
const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
const csvEscape=(v:string)=>'"'+(/^[=+@-]/.test(v)?"'"+v:v).replace(/"/g,'""')+'"';
export default function OficinaV1(){
 const [module,setModule]=useState<Module>('visao');
 const [records,setRecords]=useState<Record<Module,Row[]>>(initial);
 const [editing,setEditing]=useState<string|null>(null);
 const [open,setOpen]=useState(false);
 const [form,setForm]=useState<Record<string,string>>({});
 const [filter,setFilter]=useState('');
 const [message,setMessage]=useState('');
 const [mobile,setMobile]=useState(false);
 const [section,setSection]=useState<'financeiro'|'propostas'|'agenda'|'clientes'>('financeiro');
 const values=records[module];
 const rows=useMemo(()=>values.filter(r=>Object.values(r).some(x=>x.toLocaleLowerCase('pt-BR').includes(filter.toLocaleLowerCase('pt-BR')))),[values,filter]);
 const settled=records.financeiro.filter(r=>r.status==='Liquidado');
 const received=settled.filter(r=>r.category==='Receita').reduce((v,r)=>v+Number(r.amount||0),0);
 const spent=settled.filter(r=>r.category==='Despesa').reduce((v,r)=>v+Number(r.amount||0),0);
 const future=records.agenda.filter(r=>r.start&&new Date(r.start).getTime()>Date.now()&&r.status!=='Cancelada').length;
 function go(id:Module){setModule(id);setFilter('');setMessage('');setOpen(false);setMobile(false);}
 function start(row?:Row){if(module==='visao'||module==='relatorios'||module==='vitrine')return;setForm(row?{...row}:{});setEditing(row?.id||null);setOpen(true);setMessage('');}
 function save(e:React.FormEvent){e.preventDefault();if(module==='visao'||module==='relatorios'||module==='vitrine')return;
  const d=defs[module];if(!d.fields[0]||!form[d.fields[0].key]?.trim()){setMessage('Informe o primeiro campo obrigatório.');return;}
  if(module==='agenda'&&(!form.start||!form.end||!form.dome)){setMessage('Selecione cúpula, início e término da apresentação.');return;}
  if(module==='agenda'&&form.start&&form.end&&new Date(form.end)<=new Date(form.start)){setMessage('O término precisa ser posterior ao início.');return;}
  if(module==='agenda'&&form.start&&form.end){
   if(!records.cupulas.some(x=>x.id===form.dome&&x.status!=='Inativa'&&x.status!=='Manutenção')){setMessage('Escolha uma cúpula disponível.');return;}
   const conflict=records.agenda.some(x=>x.id!==editing&&x.dome===form.dome&&x.status!=='Cancelada'&&
    new Date(x.start)<new Date(form.end)&&new Date(x.end)>new Date(form.start));
   if(conflict){setMessage('Já existe uma apresentação nessa cúpula e nesse horário.');return;}
  }
  if(module==='propostas'){
   const total=Math.max(0,(form.mode==='Por aluno'?Number(form.qty||0)*Number(form.unit||0):form.mode==='Preço fechado'?Number(form.fixed||0):0)-Number(form.discount||0));
   if(Number(form.deposit||0)>total){setMessage('O sinal não pode ser maior que o valor da proposta.');return;}
  }
  for(const [key,target] of Object.entries(relations[module]||{}) as [string,Module][]){
   if(form[key]&&!records[target].some(r=>r.id===form[key])){setMessage('O vínculo selecionado não existe.');return;}
  }
  const row:Row={...form,id:editing||('local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6))};
  setRecords(prev=>({...prev,[module]:editing?prev[module].map(x=>x.id===editing?row:x):[row,...prev[module]]}));
  setOpen(false);setMessage('Registro atualizado nesta demonstração. Não foi enviado ao banco.');
 }
 function remove(id:string){
  const blocked=Object.entries(relations).some(([child,fields])=>
   Object.entries(fields||{}).some(([key,target])=>target===module&&records[child as Module].some(r=>r[key]===id)));
  if(blocked){setMessage('Registro possui vínculos. Remova os registros relacionados primeiro.');return;}
  if(!confirm('Excluir somente deste rascunho local?'))return;setRecords(p=>({...p,[module]:p[module].filter(x=>x.id!==id)}));setMessage('Registro retirado da demonstração.');}
 function download(id:Module){if(id==='visao'||id==='relatorios'||id==='vitrine')return;const fields=defs[id].fields;const head=fields.map(f=>f.label);const lines=records[id].map(r=>fields.map(f=>relationLabel(id,f.key,r,records)));const csv='\uFEFF'+[head,...lines].map(l=>l.map(csvEscape).join(';')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='antares-'+id+'-rascunho.csv';a.click();URL.revokeObjectURL(url);}
 const fieldInfo=module!=='visao'&&module!=='relatorios'&&module!=='vitrine'?defs[module]:null;
 return <div className="oficina">
  <aside className={mobile?'oficina-nav visible':'oficina-nav'}>
   <div className="oficina-logo">✦ ANTARES <span>BUSINESS V1</span></div>
   <p className="oficina-caption">OFICINA FUNCIONAL · ETAPA 1</p>
   {groups.map(g=><div key={g.label}><h3>{g.label}</h3>{g.items.map(item=><button key={item.id} onClick={()=>go(item.id)} className={module===item.id?'active':''}><item.icon size={17}/>{names[item.id]}{records[item.id].length>0&&<span>{records[item.id].length}</span>}</button>)}</div>)}
   <Link href="/" className="oficina-back">← Voltar ao painel existente</Link>
  </aside>
  <main className="oficina-main">
   <header className="oficina-top"><button onClick={()=>setMobile(v=>!v)} className="oficina-toggle" aria-label="Abrir menu">☰</button><div><strong>ANTARES BUSINESS</strong><span>Oficina V1 · pré-integração</span></div><span className="oficina-pill">Dados locais temporários</span></header>
   <div className="oficina-content">
    <div className="oficina-heading"><div><p>FLUXOS DO PRODUTO</p><h1>{fieldInfo?.title||names[module]}</h1><span>{fieldInfo?.description||(module==='visao'?'Todos os módulos da etapa 1 em um só lugar':module==='relatorios'?'Indicadores e exportações para conferência':'Vitrine e captação de orçamentos')}</span></div>{fieldInfo&&<button className="oficina-primary" onClick={()=>start()}><Plus size={17}/> Novo registro</button>}</div>
    <div className="oficina-warning" role="status"><strong>Etapa 1 — Demonstração funcional:</strong> os registros permanecem apenas nesta tela enquanto ela estiver aberta. Recarregar a página apaga os rascunhos. Não há envio ao Neon, convites reais ou pagamentos.</div>
    {module==='visao'&&<>
     <div className="oficina-stats">{[['Clientes',records.clientes.length],['Propostas',records.propostas.length],['Próximas apresentações',future],['Saldo realizado',money(received-spent)]].map(([k,v])=><div key={k}><small>{k}</small><strong>{v}</strong></div>)}</div>
     <div className="oficina-panels"><section><h2>Operação completa</h2><p>Cadastre clientes, vincule propostas e contratos, reserve cúpulas, registre pagamentos e consulte os relatórios. Tudo pode ser explorado antes da implantação.</p><div className="oficina-actions">{(['clientes','propostas','agenda','financeiro'] as Module[]).map(id=><button key={id} onClick={()=>go(id)}>{names[id]} →</button>)}</div></section><section><h2>Próxima implantação</h2><p>Esta oficina é uma experiência isolada. Os módulos reais já iniciados permanecem em <Link href="/clientes">Clientes</Link> e <Link href="/operacoes">Central de Operações</Link>. A ligação integral ao Neon será feita na Etapa 2.</p></section></div>
    </>}
    {module==='relatorios'&&<>
     <div className="oficina-stats">{[['Recebido',money(received)],['Despesas pagas',money(spent)],['A receber',money(records.financeiro.filter(r=>r.status==='Previsto'&&r.category==='Receita').reduce((v,r)=>v+Number(r.amount||0),0))],['Contratos pendentes',records.contratos.filter(r=>r.status==='Pendente').length]].map(([k,v])=><div key={k}><small>{k}</small><strong>{v}</strong></div>)}</div>
     <section className="oficina-panel"><h2>Relatórios operacionais</h2><div className="oficina-tabs">{(['financeiro','propostas','agenda','clientes'] as const).map(x=><button key={x} onClick={()=>setSection(x)} className={section===x?'active':''}>{names[x]}</button>)}</div><p>Prévia dos registros da oficina. Exportação em CSV para revisão local.</p><button className="oficina-secondary" onClick={()=>download(section)}><Download size={16}/> Exportar {names[section]}</button><div className="oficina-records">{records[section].map(x=><div key={x.id}><strong>{x.name||x.description||x.id}</strong><span>{Object.values(x).filter(v=>v!==x.id).slice(1,4).join(' · ')}</span></div>)}{records[section].length===0&&<p>Nenhum registro local para exportar.</p>}</div></section>
    </>}
    {module==='vitrine'&&<div className="oficina-panels"><section><p className="oficina-kicker">PLANETÁRIO KIDS</p><h2>Descubra o universo sem sair da escola!</h2><p>Experiência infantil para escolas, associações, eventos e empresas. Sessões imersivas e programação educativa.</p><button className="oficina-primary" onClick={()=>go('propostas')}>Solicitar orçamento →</button><p className="oficina-muted">Fluxo de demonstração. A vitrine pública existente está disponível em <Link href="/vitrine">/vitrine</Link>.</p></section><section className="oficina-space">🪐<span>ASTRO · LUNNA · ESPAÇO</span></section></div>}
    {fieldInfo&&<>
     <div className="oficina-toolbar"><label><Search size={17}/><input placeholder="Pesquisar registros..." value={filter} onChange={e=>setFilter(e.target.value)}/></label><button className="oficina-secondary" onClick={()=>download(module)}><Download size={16}/> Exportar CSV</button></div>
     <section className="oficina-panel"><div className="oficina-panel-head"><h2>{fieldInfo.title}</h2><small>{rows.length} registro(s)</small></div><div className="oficina-records">{rows.map(row=><div key={row.id}><div><strong>{row.name||'Registro'}</strong><span>{fieldInfo.fields.filter(f=>f.key!=='name').slice(0,4).map(f=>relationLabel(module,f.key,row,records)).filter(Boolean).join(' · ')}</span>{module==='propostas'&&<small>Total estimado: {money(Math.max(0,(row.mode==='Por aluno'?Number(row.qty||0)*Number(row.unit||0):row.mode==='Preço fechado'?Number(row.fixed||0):0)-Number(row.discount||0)))}</small>}</div><div className="oficina-record-actions"><button onClick={()=>start(row)}>Editar</button><button aria-label="Excluir registro" onClick={()=>remove(row.id)}><Trash2 size={16}/></button></div></div>)}{rows.length===0&&<div className="oficina-empty"><ClipboardList size={27}/><strong>Nenhum registro nesta área</strong><span>Crie o primeiro registro para experimentar o fluxo completo.</span></div>}</div></section>
    </>}
    {message&&<p className="oficina-feedback" role="status">{message}</p>}
    {open&&fieldInfo&&<div className="oficina-modal-backdrop" role="presentation"><section className="oficina-modal" role="dialog" aria-modal="true" aria-label={editing?'Editar registro':'Novo registro'}><div className="oficina-modal-head"><h2>{editing?'Editar':'Novo'} · {fieldInfo.title}</h2><button onClick={()=>setOpen(false)} aria-label="Fechar">✕</button></div><form onSubmit={save}><div className="oficina-fields">{fieldInfo.fields.map((f,i)=><label key={f.key}>{f.label}{relations[module]?.[f.key]?<select value={form[f.key]||''} required={['client','proposal','dome'].includes(f.key)} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}><option value="">Selecione {f.label.toLowerCase()}</option>{records[relations[module]![f.key]].map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>:f.options?<select value={form[f.key]||''} required={i===0} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}><option value="">Selecione</option>{f.options.map(x=><option key={x} value={x}>{x}</option>)}</select>:<input type={f.type||'text'} step={f.type==='number'?'0.01':undefined} min={f.type==='number'?'0':undefined} value={form[f.key]||''} required={i===0} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}/>}</label>)}</div>{module==='propostas'&&<p className="oficina-total">Total: {money(Math.max(0,(form.mode==='Por aluno'?Number(form.qty||0)*Number(form.unit||0):form.mode==='Preço fechado'?Number(form.fixed||0):0)-Number(form.discount||0)))}</p>}<div className="oficina-modal-actions"><button type="button" onClick={()=>setOpen(false)}>Cancelar</button><button type="submit" className="oficina-primary">Salvar rascunho</button></div></form></section></div>}
   </div>
  </main>
 </div>;
}
