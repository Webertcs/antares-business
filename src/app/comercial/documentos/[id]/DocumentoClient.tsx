'use client';
import {useState} from 'react';
import Link from 'next/link';
type D={id:string;title:string;status:string;pricingModel:string;attendees:number;unitPrice:number;fixedPrice:number;discount:number;deposit:number;total:number;notes:string;paymentTerms:string;validUntil:string;clientName:string;clientKind:string};
const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
export default function DocumentoClient({doc}:{doc:D}){
 const [mode,setMode]=useState<'proposal'|'contract'>('proposal');
 const [confirmation,setConfirmation]=useState('formal');
 const [provider,setProvider]=useState({name:'',document:'',address:'',representative:''});
 const [showNotes,setShowNotes]=useState(false);
 const today=new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeZone:'America/Sao_Paulo'}).format(new Date());
 return <main style={{background:'#e8eef9',minHeight:'100vh',padding:'24px 12px',color:'#142d52',fontFamily:'Arial,sans-serif'}}>
 <style>{`@media print{ @page{size:A4;margin:10mm;} body{background:white!important} .screen-only{display:none!important} .document{box-shadow:none!important;border:none!important;margin:0!important;padding:0!important;max-width:none!important;font-size:11px!important;line-height:1.25!important} .document h1{font-size:19px!important;margin-top:14px!important} .document h2{font-size:14px!important;margin:9px 0!important}.document p{margin:5px 0!important}.document th,.document td{padding:5px!important}.document header{padding-bottom:7px!important}.document section{margin-top:20px!important}.document footer{margin-top:18px!important} }`}</style>
 <div className="screen-only" style={{maxWidth:850,margin:'0 auto 18px',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
 <Link href="/operacoes">← Operações</Link>
 <label style={{marginLeft:'auto'}}>Documento <select value={mode} onChange={e=>setMode(e.target.value as 'proposal'|'contract')} style={{padding:9,borderRadius:6}}><option value="proposal">Proposta comercial</option><option value="contract">Minuta de contrato</option></select></label>
 {mode==='contract'&&<label>Modalidade <select value={confirmation} onChange={e=>setConfirmation(e.target.value)} style={{padding:9}}><option value="formal">Formal</option><option value="verbal">Verbal</option><option value="whatsapp">WhatsApp</option></select></label>}
 <button onClick={()=>window.print()} style={{background:'#1749ac',color:'white',padding:'11px 17px',borderRadius:7}}>Imprimir / Salvar PDF</button>
 </div>
 <section className="screen-only" style={{maxWidth:850,margin:'0 auto 16px',padding:16,borderRadius:9,background:'white'}}>
 <strong>Identificação do prestador — preencher antes de imprimir</strong>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginTop:12}}>
 {([['name','Razão social / nome'],['document','CPF / CNPJ'],['address','Endereço'],['representative','Representante']] as const).map(([key,label])=>
 <label key={key}>{label}<input value={provider[key]} onChange={e=>setProvider(v=>({...v,[key]:e.target.value}))} style={{display:'block',width:'100%',padding:9,border:'1px solid #b6c7dd',borderRadius:6}} /></label>)}
 </div><p style={{fontSize:12}}>Dados preenchidos apenas para impressão; não são armazenados no CRM.</p>
 <label><input type="checkbox" checked={showNotes} onChange={e=>setShowNotes(e.target.checked)}/> Incluir observações da proposta após revisão (podem conter dados internos)</label>
 </section>
 <article className="document" style={{maxWidth:850,margin:'auto',background:'white',padding:'26px clamp(20px,4vw,42px)',borderRadius:8,boxShadow:'0 5px 25px #1e3c7020'}}>
 <header style={{borderBottom:'3px solid #1f63c7',paddingBottom:15,display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
 <img src="/images/logo-antares.png" alt="ANTARES Planetário Móvel" style={{width:160,height:'auto'}}/>
 <div style={{marginLeft:'auto',textAlign:'right'}}><strong>ANTARES BUSINESS</strong><div style={{fontSize:12}}>Documento gerado do CRM</div></div>
 </header>
 <h1 style={{fontSize:23,marginTop:30}}>{mode==='proposal'?'PROPOSTA COMERCIAL':'MINUTA DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS'}</h1>
 {mode==='contract'&&<p style={{padding:10,background:'#fff5df',fontWeight:700}}>MINUTA NÃO ASSINADA — sem registro de formalização no CRM</p>}
 <p><strong>Contratante:</strong> {doc.clientName}</p>
 <p><strong>Prestador:</strong> {provider.name||'NÃO INFORMADO — preencher antes de emitir'}</p>
 <p><strong>Documento do prestador:</strong> {provider.document||'Não informado'}</p>
 <p><strong>Endereço:</strong> {provider.address||'Não informado'}</p>
 <p><strong>Representante:</strong> {provider.representative||'Não informado'}</p>
 <p><strong>Objeto:</strong> {doc.title}</p>
 <p><strong>Identificador da proposta:</strong> {doc.id}</p>
 <hr style={{border:0,borderTop:'1px solid #c9d7eb',margin:'24px 0'}}/>
 <h2 style={{fontSize:17}}>Condições comerciais</h2>
 <table style={{width:'100%',borderCollapse:'collapse',marginBottom:20}}>
 <tbody>{[
 ['Forma de cobrança',doc.pricingModel==='per_student'?'Por aluno':doc.pricingModel==='fixed'?'Valor fechado':'Cortesia'],
 ['Participantes previstos',String(doc.attendees)],
 ['Valor por aluno',money(doc.unitPrice)],['Valor fechado',money(doc.fixedPrice)],
 ['Desconto',money(doc.discount)],['Valor total',money(doc.total)],
 ['Sinal previsto',money(doc.deposit)],['Saldo após sinal (se recebido)',money(Math.max(0,doc.total-doc.deposit))],
 ['Validade da proposta',doc.validUntil||'Não informada']
 ].map(([label,value])=><tr key={label}><th style={{textAlign:'left',padding:10,borderBottom:'1px solid #e1e7f0',width:'50%'}}>{label}</th><td style={{padding:10,borderBottom:'1px solid #e1e7f0'}}>{value}</td></tr>)}</tbody></table>
 <p style={{fontSize:12}}>O sinal indicado é uma condição comercial prevista, não comprovação de pagamento.</p>
 <h2 style={{fontSize:17}}>Condições de pagamento</h2>
 <p style={{whiteSpace:'pre-wrap'}}>{doc.paymentTerms||'A definir e confirmar entre as partes.'}</p>
 {showNotes&&doc.notes&&<><h2 style={{fontSize:17}}>Observações revisadas</h2><p style={{whiteSpace:'pre-wrap'}}>{doc.notes}</p></>}
 {mode==='contract'&&<section>
 <h2 style={{fontSize:17}}>Confirmação e execução</h2>
 <p>Modalidade prevista de confirmação: <strong>{confirmation==='formal'?'Instrumento formal':confirmation==='verbal'?'Acordo verbal':'WhatsApp'}</strong>.</p>
 <p>Data, local, duração, condições de montagem, cancelamento e responsabilidades devem ser preenchidos e aceitos expressamente pelas partes antes de qualquer formalização.</p>
 <p>Este documento é uma minuta de apoio e não comprova contratação ou aceite eletrônico.</p>
 </section>}
 <section style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32,marginTop:72,breakInside:'avoid'}}>
 <div style={{borderTop:'1px solid #263c62',paddingTop:10,textAlign:'center'}}>Contratante / responsável</div>
 <div style={{borderTop:'1px solid #263c62',paddingTop:10,textAlign:'center'}}>Representante do planetário</div>
 </section>
 <footer style={{borderTop:'1px solid #d3deec',marginTop:46,paddingTop:12,fontSize:11,color:'#60708c'}}>
 Gerado em {today}. Documento para conferência. Situação da proposta no CRM: {doc.status}.
 </footer>
 </article>
 </main>;
}
