'use client';
import {useRef} from 'react';

type AuditDetailsProps={action:string;entityType:string;entityId:string|null};
export default function AuditDetails({action,entityType,entityId}:AuditDetailsProps){
 const dialog=useRef<HTMLDialogElement>(null);
 return <>
  <button type="button" className="operation-audit-open" onClick={()=>dialog.current?.showModal()}>Consultar</button>
  <dialog ref={dialog} className="operation-audit-dialog" aria-label="Detalhes da atividade" onClick={e=>{if(e.target===dialog.current)dialog.current?.close()}}>
   <div className="operation-audit-dialog-head"><h3>Detalhes da atividade</h3><button type="button" aria-label="Fechar detalhes" onClick={()=>dialog.current?.close()}>×</button></div>
   <dl><dt>Ação original</dt><dd>{action}</dd><dt>Tipo de registro</dt><dd>{entityType}</dd><dt>Identificador</dt><dd>{entityId||'—'}</dd></dl>
   <form method="dialog"><button type="submit" className="operation-audit-close">Fechar</button></form>
  </dialog>
 </>;
}
