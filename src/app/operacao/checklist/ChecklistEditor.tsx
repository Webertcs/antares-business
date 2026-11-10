'use client';
import {useCallback,useEffect,useState} from 'react';

export default function ChecklistEditor(){
 const [items,setItems]=useState<string[]>([]);
 const [saved,setSaved]=useState<string[]>([]);
 const [newItem,setNewItem]=useState('');
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [canEdit,setCanEdit]=useState(false);
 const [message,setMessage]=useState('');
 const load=useCallback(async()=>{
  try{
   const response=await fetch('/api/operacao/checklist-modelo',{cache:'no-store'});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Erro ao carregar');
   setItems(data.items);setSaved(data.items);setCanEdit(data.canEdit);
  }catch(error){setMessage(error instanceof Error?error.message:'Falha ao carregar');}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 const changed=JSON.stringify(items)!==JSON.stringify(saved);
 function add(){
  const value=newItem.trim();
  if(value.length<2||value.length>160){setMessage('O item deve ter de 2 a 160 caracteres.');return;}
  if(items.length>=80){setMessage('Limite de 80 itens.');return;}
  setItems(previous=>[...previous,value]);setNewItem('');setMessage('');
 }
 function move(index:number,direction:number){
  const next=index+direction;
  if(next<0||next>=items.length)return;
  setItems(previous=>{const copy=[...previous];[copy[index],copy[next]]=[copy[next],copy[index]];return copy;});
 }
 async function save(){
  setSaving(true);setMessage('');
  try{
   const response=await fetch('/api/operacao/checklist-modelo',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Erro ao salvar');
   setSaved([...items]);setMessage('Modelo padrão salvo com sucesso.');
  }catch(error){setMessage(error instanceof Error?error.message:'Falha ao salvar');}
  finally{setSaving(false);}
 }
 const button:React.CSSProperties={border:'1px solid #b8d0f4',borderRadius:8,padding:'7px 11px',color:'#174987',background:'#fff',cursor:'pointer'};
 return <section style={{background:'#eef5ff',border:'1px solid #c9dcf7',borderRadius:14,padding:24,marginTop:18}}>
  <h2 style={{fontSize:19,fontWeight:750,margin:'0 0 8px'}}>Modelo padrão do planetário</h2>
  <p style={{lineHeight:1.5,margin:'0 0 16px'}}>Crie o checklist uma única vez. Este modelo será usado na preparação dos próximos eventos, sem alterar registros antigos.</p>
  {loading?<p>Carregando modelo...</p>:<>
   <p style={{fontSize:13,margin:'0 0 12px',color:'#42658f'}}>{items.length} de 80 itens {changed?'· Alterações não salvas':'· Modelo atualizado'}</p>
   {items.length===0&&<p style={{padding:14,background:'#fff',borderRadius:8}}>Nenhum item cadastrado. Comece adicionando a primeira tarefa.</p>}
   <div style={{display:'grid',gap:9}}>
    {items.map((item,index)=><div key={index} style={{display:'flex',alignItems:'center',gap:8,background:'#fff',border:'1px solid #d4e2f5',borderRadius:10,padding:9}}>
     <span style={{minWidth:25,fontWeight:700,color:'#5276a3'}}>{index+1}.</span>
     <input aria-label={`Item ${index+1}`} value={item} disabled={!canEdit} maxLength={160} onChange={e=>setItems(previous=>previous.map((v,i)=>i===index?e.target.value:v))} style={{flex:1,minWidth:0,padding:8,border:'1px solid #c8d8ef',borderRadius:7,color:'#163d73',background:'#fff'}}/>
     {canEdit&&<>
      <button type="button" style={button} title="Mover para cima" disabled={index===0} onClick={()=>move(index,-1)}>↑</button>
      <button type="button" style={button} title="Mover para baixo" disabled={index===items.length-1} onClick={()=>move(index,1)}>↓</button>
      <button type="button" style={{...button,color:'#a32929'}} title="Remover item" onClick={()=>setItems(previous=>previous.filter((_,i)=>i!==index))}>×</button>
     </>}
    </div>)}
   </div>
   {canEdit&&<><div style={{display:'flex',gap:8,marginTop:16,flexWrap:'wrap'}}>
    <input aria-label="Nova tarefa" placeholder="Ex.: Conferir projetor e cabos" maxLength={160} value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add();}}} style={{flex:'1 1 240px',padding:12,border:'1px solid #b8d0f4',borderRadius:9,color:'#163d73',background:'#fff'}}/>
    <button type="button" onClick={add} style={{...button,background:'#dceafe',fontWeight:700}}>+ Adicionar item</button>
   </div>
   <div style={{display:'flex',gap:10,marginTop:20,alignItems:'center'}}>
    <button type="button" disabled={saving||!changed||items.some(v=>v.trim().length<2)} onClick={()=>void save()} style={{border:0,borderRadius:9,padding:'12px 20px',fontWeight:700,color:'#fff',background:'#1759bd',opacity:saving||!changed?0.6:1,cursor:'pointer'}}>{saving?'Salvando...':'Salvar modelo padrão'}</button>
    {changed&&<button type="button" style={button} onClick={()=>{setItems([...saved]);setMessage('');}}>Descartar alterações</button>}
   </div></>}
   {message&&<p role="status" style={{fontWeight:650,margin:'14px 0 0'}}>{message}</p>}
  </>}
 </section>;
}