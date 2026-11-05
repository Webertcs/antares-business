'use client';
import {useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
type Model='per_student'|'fixed'|'complimentary';
type Data={id:string;status:string;pricing_model:string;expected_attendees:number|null;unit_price:number;fixed_price:number;discount:number;deposit:number};
export default function Editor({proposal:p}:{proposal:Data}){
 const router=useRouter();
 const [model,setModel]=useState<Model>((['per_student','fixed','complimentary'].includes(p.pricing_model)?p.pricing_model:'per_student') as Model);
 const [attendees,setAttendees]=useState(p.expected_attendees??0);
 const [unit,setUnit]=useState(Number(p.unit_price));
 const [fixed,setFixed]=useState(Number(p.fixed_price));
 const [discount,setDiscount]=useState(Number(p.discount));
 const [deposit,setDeposit]=useState(Number(p.deposit));
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const total=useMemo(()=>Math.max(0,(model==='per_student'?attendees*unit:model==='fixed'?fixed:0)-discount),[model,attendees,unit,fixed,discount]);
 const valid=[attendees,unit,fixed,discount,deposit,total].every(Number.isFinite)&&
  Number.isInteger(attendees)&&attendees>=0&&attendees<=100000&&
  [unit,fixed,discount,deposit].every(v=>v>=0&&v<=10000000&&Math.abs(v*100-Math.round(v*100))<0.000001)&&
  discount<=(model==='per_student'?attendees*unit:model==='fixed'?fixed:0)&&deposit<=total;
 const money=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const input=(name:string,value:number,change:(n:number)=>void,step='0.01')=><label style={{display:'flex',flexDirection:'column',gap:4,fontWeight:600}}>{name}<input type="number" min="0" step={step} value={value} onChange={e=>change(e.target.value===''?NaN:Number(e.target.value))} style={{padding:10,border:'1px solid #64748b',borderRadius:8}} /></label>;
 async function save(){
  if(!valid||busy)return;
  setBusy(true);setNotice('');
  try{
   const r=await fetch('/api/vitrine/proposta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:p.id,model,attendees,unit,fixed,discount,deposit})});
   const d=await r.json();if(!r.ok)throw Error(d.error||'Falha ao salvar.');
   setNotice('Rascunho salvo e alteração registrada na auditoria.');router.refresh(); 
  }catch(e){setNotice(e instanceof Error?e.message:'Erro ao salvar.');}
  finally{setBusy(false);}
 }
 return <section style={{border:'1px solid #64748b',borderRadius:14,padding:20,marginTop:16}}>
 <h2 style={{fontSize:21,fontWeight:700}}>Editar valores da proposta</h2>
 {p.status!=='draft'?<p>Somente propostas em rascunho podem ser editadas.</p>:<>
 <p>Os preços são calculados automaticamente. Nada é enviado ao cliente.</p>
 <label style={{display:'flex',flexDirection:'column',maxWidth:350,gap:5,fontWeight:600}}>Modelo de cobrança
 <select value={model} onChange={e=>setModel(e.target.value as Model)} style={{padding:10,border:'1px solid #64748b',borderRadius:8}}>
 <option value="per_student">Por aluno</option><option value="fixed">Valor fechado</option><option value="complimentary">Cortesia</option>
 </select></label>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:14,margin:'18px 0'}}>
 {input('Participantes',attendees,setAttendees,'1')}
 {model==='per_student'&&input('Preço por aluno (R$)',unit,setUnit)}
 {model==='fixed'&&input('Valor fechado (R$)',fixed,setFixed)}
 {input('Desconto (R$)',discount,setDiscount)}
 {input('Sinal previsto (R$)',deposit,setDeposit)}
 </div>
 <div style={{background:'#102a55',color:'#fff',padding:18,borderRadius:12}}>
 <p style={{margin:0}}>Total estimado</p><strong style={{fontSize:29}}>{valid?money(total):'Valores inválidos'}</strong>
 <p style={{margin:'6px 0 0'}}>Saldo previsto após sinal: {valid?money(total-deposit):'—'}</p>
 </div>
 {!valid&&<p role="alert">Confira os valores: desconto não pode superar o bruto e sinal não pode superar o total.</p>}
 <button onClick={()=>void save()} disabled={!valid||busy} style={{padding:'12px 20px',background:'#1d4ed8',color:'white',borderRadius:9,marginTop:16,opacity:valid&&!busy?1:.5}}>{busy?'Salvando...':'Salvar rascunho'}</button>
 {notice&&<p role="status">{notice}</p>}
 </>}
 </section>;
}
