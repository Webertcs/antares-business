import RelationshipShell from '../RelationshipShell';
import './notifications.css';
export default function Layout({children}:{children:React.ReactNode}){
 return <RelationshipShell title="Notificações">{children}</RelationshipShell>;
}
