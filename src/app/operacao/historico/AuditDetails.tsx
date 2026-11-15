'use client';
import {useRef} from 'react';

type AuditDetailsProps={action:string;entityType:string;entityId:string|null;activity?:string;area?:string;date?:string};
export default function AuditDetails({action,entityType,entityId,activity,area,date}:AuditDetailsProps){
 const dialog=useRef<HTMLDialogElement>(null);
 const description=activity||'Atividade registrada';
 const category=area||'Registro operacional';
 return <>
  <button type="button" className="operation-audit-open" onClick={()=>dialog.current?.showModal()}>Ver detalhes</button>
  <dialog ref={dialog} className="operation-audit-dialog" aria-label="Detalhes da atividade" onClick={e=>{if(e.target===dialog.current)dialog.current?.close()}}>
   <div className="operation-audit-dialog-head"><h3>Detalhes da atividade</h3><button type="button" aria-label="Fechar detalhes" onClick={()=>dialog.current?.close()}>×</button></div>
   <p style={{margin:'10px 0 16px',color:'#345b8d'}}>Este registro confirma que uma atividade foi registrada no sistema. Não apresenta, por si só, os valores anteriores ou quem realizou a alteração.</p>
   <dl><dt>Atividade</dt><dd>{description}</dd><dt>Área</dt><dd>{category}</dd>{date&&<><dt>Data e hora</dt><dd>{date}</dd></>}</dl>
   <details style={{marginTop:12,fontSize:12,color:'#55739b'}}><summary style={{cursor:'pointer'}}>Informações técnicas</summary><dl><dt>Ação registrada</dt><dd>{action}</dd><dt>Tipo de registro</dt><dd>{entityType}</dd><dt>Identificador do registro</dt><dd style={{overflowWrap:'anywhere'}}>{entityId||'Não informado'}</dd></dl></details>
   <form method="dialog"><button type="submit" className="operation-audit-close">Fechar</button></form>
  </dialog>
 </>;
}
