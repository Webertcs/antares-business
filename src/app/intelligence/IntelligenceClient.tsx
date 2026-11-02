'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Metrics={clients:{total:number};proposals:{total:number;accepted:number;accepted_value:string};presentations:{upcoming:number;completed:number};receivables:{overdue:number;total:string};education:{groups:number;students:number};generatedAt:string};
const cash=(v:unknown)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
export default function IntelligenceClient(){
 const [data,setData]=useState<Metrics|null>(null),[error,setError]=useState('');
 useEffect(()=>{const ac=new AbortController();fetch('/api/intelligence',{cache:'no-store',signal:ac.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Falha');return d;}).then(setData).catch(e=>{if(e?.name!=='AbortError')setError(e.message)});return()=>ac.abort();},[]);
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
 return <main style={{maxWidth:1200,margin:'0 auto',padding:'28px 18px',fontFamily:'system-ui',color:'#102e5b'}}>
 <Link href="/">← Painel</Link><p style={{fontSize:12,letterSpacing:2,marginTop:24}}>ANTARES BUSINESS · BLOCO 12</p>
 <h1 style={{fontSize:32,fontWeight:800}}>ANTARES Intelligence</h1>
 <p>Painel de decisão baseado em dados do CRM. Análises automáticas por regras, sem IA generativa nem chamadas externas.</p>
 {error&&<p role="alert" style={{padding:14,background:'#fff0d9'}}>{error}</p>}
 {!data&&!error&&<p>Consultando os indicadores...</p>}
 {data&&<><section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))',gap:12,marginTop:22}}>
 {cells.map(([title,value])=><div key={String(title)} style={{border:'1px solid #cad9ec',borderRadius:12,padding:18,background:'#f6f9ff'}}>
 <small>{title}</small><div style={{fontWeight:750,fontSize:23,marginTop:7}}>{value}</div></div>)}
 </section>
 <section style={{padding:21,border:'1px solid #cad9ec',borderRadius:12,marginTop:20}}>
 <h2 style={{fontSize:22}}>Recomendações gerenciais</h2>
 {recommendations.length? <ul style={{paddingLeft:22}}>{recommendations.map(t=><li key={t} style={{margin:'12px 0'}}>{t}</li>)}</ul>:<p>Nenhum alerta sugerido pelos indicadores disponíveis.</p>}
 <p style={{fontSize:12}}>As recomendações são pistas para conferência humana, não decisões automáticas.</p>
 </section>
 <section style={{padding:21,border:'1px solid #cad9ec',borderRadius:12,marginTop:20}}>
 <h2 style={{fontSize:22}}>Acessos para ação</h2>
 <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
 <Link href="/operacoes">Comercial e operações</Link><Link href="/financeiro/receber">Contas a receber</Link>
 <Link href="/fidelizacao">Fidelização</Link><Link href="/educacional">Turmas e professores</Link>
 </div><p style={{fontSize:12}}>Propostas aceitas não equivalem a receitas recebidas. O painel não modifica registros.</p>
 </section></>}
 </main>;
}
