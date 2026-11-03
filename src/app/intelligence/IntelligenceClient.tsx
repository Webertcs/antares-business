'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft,ArrowUpRight,BarChart3,CheckCircle2,Lightbulb} from 'lucide-react';

type Metrics={clients:{total:number};proposals:{total:number;accepted:number;accepted_value:string};presentations:{upcoming:number;completed:number};receivables:{overdue:number;total:string};education:{groups:number;students:number};generatedAt:string};
const cash=(v:unknown)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);

export default function IntelligenceClient(){
 const router=useRouter();
 const [data,setData]=useState<Metrics|null>(null),[error,setError]=useState('');
 useEffect(()=>{const ac=new AbortController();fetch('/api/intelligence',{cache:'no-store',signal:ac.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível carregar os indicadores.');return d;}).then(setData).catch(e=>{if(e?.name!=='AbortError')setError(e.message)});return()=>ac.abort();},[]);
 function goBack(){
   try{
     if(document.referrer && new URL(document.referrer).origin===window.location.origin && window.history.length>1){router.back();return;}
   }catch{}
   router.push('/');
 }
 const recommendations:string[]=[];
 if(data){
  if(data.receivables.overdue>0)recommendations.push('Revisar os títulos vencidos no módulo Contas a Receber; não registrar pagamento sem confirmação.');
  if(data.proposals.accepted>0&&data.presentations.upcoming===0)recommendations.push('Conferir se as propostas aceitas possuem apresentações agendadas. A existência da proposta não comprova a reserva.');
  if(data.clients.total>0&&data.presentations.completed===0)recommendations.push('Avaliar contato de acompanhamento com as instituições sem visitas concluídas.');
  if(data.education.groups===0)recommendations.push('Quando houver turmas confirmadas, registrar quantidade de alunos e responsável institucional.');
 }
 const cells=data?[
  ['Instituições',data.clients.total],['Propostas',data.proposals.total],['Propostas aceitas',data.proposals.accepted],
  ['Valor aceito',cash(data.proposals.accepted_value)],['Apresentações futuras',data.presentations.upcoming],
  ['Apresentações concluídas',data.presentations.completed],['Títulos vencidos',data.receivables.overdue],
  ['Turmas',data.education.groups],['Alunos previstos',data.education.students]]:[];
 return <main className="intelligence-refined">
  <header className="intelligence-head">
   <div>
    <button type="button" className="intelligence-back" onClick={goBack}><ArrowLeft size={15}/> Voltar</button>
    <h1>ANTARES Intelligence</h1>
    <p>Indicadores e recomendações para a gestão do seu planetário.</p>
   </div>
   <div className="intelligence-head-icon" aria-hidden="true"><BarChart3 size={25}/></div>
  </header>
  {error&&<p role="alert" className="intelligence-error">{error}</p>}
  {!data&&!error&&<p role="status" className="intelligence-loading">Consultando os indicadores...</p>}
  {data&&<>
   <section className="intelligence-metrics" aria-label="Indicadores do negócio">
    {cells.map(([title,value])=><article key={String(title)} className="intelligence-metric"><span>{title}</span><strong>{value}</strong></article>)}
   </section>
   <section className="intelligence-recommendations" aria-labelledby="intelligence-recommendations-heading">
    <div className="intelligence-section-head"><span className="intelligence-section-icon"><Lightbulb size={19}/></span><h2 id="intelligence-recommendations-heading">Recomendações gerenciais</h2></div>
    {recommendations.length?<ul>{recommendations.map(t=><li key={t}><CheckCircle2 size={16} aria-hidden="true"/><span>{t}</span></li>)}</ul>:<p>Nenhuma recomendação pendente nos indicadores disponíveis.</p>}
    <p className="intelligence-footnote">Sugestões para avaliação do responsável. As decisões permanecem sob seu controle.</p>
   </section>
   <section className="intelligence-actions" aria-labelledby="intelligence-actions-heading">
    <h2 id="intelligence-actions-heading">Acessos rápidos</h2>
    <nav aria-label="Acessos dos relatórios">
     <Link href="/operacoes">Comercial e operações <ArrowUpRight size={14}/></Link>
     <Link href="/financeiro/receber">Contas a receber <ArrowUpRight size={14}/></Link>
     <Link href="/fidelizacao">Fidelização <ArrowUpRight size={14}/></Link>
     <Link href="/educacional">Turmas e professores <ArrowUpRight size={14}/></Link>
    </nav>
    <p className="intelligence-footnote">Propostas aceitas não representam recebimentos confirmados.</p>
   </section>
  </>}
 </main>;
}
