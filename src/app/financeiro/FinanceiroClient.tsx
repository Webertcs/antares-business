'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Entry={id:string;entry_type:'income'|'expense';amount:number;description:string;occurred_on:string;reversal_of:string|null;presentation_title:string|null;dome_name:string|null};
type Data={entries:Entry[];income:number;expenses:number;balance:number;limited:boolean;domes:{id:string;name:string;active:boolean}[]};
const brl=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
export default function FinanceiroClient(){
 const [data,setData]=useState<Data|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [type,setType]=useState('all');
 const [dome,setDome]=useState('all');
 useEffect(()=>{const c=new AbortController();fetch('/api/financeiro',{cache:'no-store',signal:c.signal})
 .then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||'Não foi possível carregar');return j;})
 .then(j=>setData(j)).catch(e=>{if(e.name!=='AbortError')setError(e.message)}).finally(()=>setLoading(false));
 return()=>c.abort();},[]);
 const entries=(data?.entries||[]).filter(e=>(type==='all'||e.entry_type===type)&&(dome==='all'||e.dome_name===dome));
 const card={border:'1px solid #bed0e8',borderRadius:14,padding:20,background:'#fff'};
 return <main style={{background:'#f3f6fc',color:'#11264d',minHeight:'100vh',padding:'clamp(20px,5vw,52px)',fontFamily:'Arial,sans-serif'}}>
 <div style={{maxWidth:1120,margin:'0 auto'}}>
 <Link href="/" style={{color:'#2854a3'}}>← Voltar ao painel</Link>
 <p style={{letterSpacing:2,fontSize:12,marginTop:25}}>ANTARES BUSINESS · BLOCO 07A</p>
 <h1 style={{fontSize:32,margin:'8px 0'}}>Gestão financeira</h1>
 <p>Livro-caixa real, sem incluir propostas ou sinais apenas previstos. Acesso exclusivo do proprietário.</p>
 {loading&&<p>Carregando movimentações...</p>}
 {error&&<p role="alert" style={{color:'#a32727'}}>{error}</p>}
 {data&&<><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:14,margin:'26px 0'}}>
 {([['Entradas realizadas',data.income],['Saídas realizadas',data.expenses],['Saldo acumulado',data.balance]] as [string,number][]).map(([label,value])=><div style={card} key={label}><small>{label}</small><h2 style={{fontSize:25}}>{brl(value)}</h2></div>)}</div>
 <section style={card}><h2>Extrato auditável</h2>
 <p style={{fontSize:13}}>Lançamentos confirmados no livro-caixa. Estornos permanecem no histórico.</p>
 <div style={{display:'flex',gap:12,flexWrap:'wrap',margin:'15px 0'}}>
 <label>Tipo <select value={type} onChange={e=>setType(e.target.value)} style={{padding:8,marginLeft:6}}><option value="all">Todos</option><option value="income">Receitas</option><option value="expense">Despesas</option></select></label>
 <label>Cúpula <select value={dome} onChange={e=>setDome(e.target.value)} style={{padding:8,marginLeft:6}}><option value="all">Todas</option>{data.domes.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}</select></label>
 </div>
 <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'left'}}>
 <thead><tr>{['Data','Descrição','Tipo','Apresentação / cúpula','Valor'].map(x=><th key={x} style={{padding:12,borderBottom:'1px solid #ccd8ea'}}>{x}</th>)}</tr></thead>
 <tbody>{entries.map(e=><tr key={e.id}>
 <td style={{padding:12,borderBottom:'1px solid #e3eaf3',whiteSpace:'nowrap'}}>{String(e.occurred_on).slice(0,10).split('-').reverse().join('/')}</td>
 <td style={{padding:12,borderBottom:'1px solid #e3eaf3'}}>{e.description}{e.reversal_of&&' (estorno)'}</td>
 <td style={{padding:12,borderBottom:'1px solid #e3eaf3'}}>{e.entry_type==='income'?'Receita':'Despesa'}</td>
 <td style={{padding:12,borderBottom:'1px solid #e3eaf3'}}>{e.presentation_title||'Não vinculada'}{e.dome_name&&' · '+e.dome_name}</td>
 <td style={{padding:12,borderBottom:'1px solid #e3eaf3',fontWeight:700}}>{e.entry_type==='income'?'+':'−'} {brl(Number(e.amount))}</td>
 </tr>)}</tbody></table>{entries.length===0&&<p>Nenhuma movimentação encontrada para os filtros selecionados.</p>}</div>
 {data.limited&&<p style={{color:'#92400e'}}>Exibindo somente os mil lançamentos mais recentes. Totais não são definitivos.</p>}
 </section>
 <section style={{...card,marginTop:20}}><h2>Novo lançamento</h2><p>Em preparação: registro auditável de receitas e despesas, com validação de permissões e prevenção de duplicidades. Nenhuma escrita está habilitada nesta etapa.</p></section>
 </>}
 </div></main>;
}
