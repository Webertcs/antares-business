export type NotificationCategory = 'opportunities'|'loyalty'|'agenda'|'finance';
export type NotificationStatus = 'pending'|'overdue'|'today'|'reviewing'|'converted'|'archived';
export type AntaresNotification = {
 id:string;
 category:NotificationCategory;
 title:string;
 detail:string;
 href:string;
 status:NotificationStatus;
 date:string|null;
 priority:'normal'|'high';
};
export type TrackedNotification = AntaresNotification & {
 readKey:string;
 read:boolean;
};
export type NotificationFeed = {
 items:TrackedNotification[];
 history:AntaresNotification[];
 count:number;
 unreadCount:number;
 opportunitiesCount:number;
 readPersistenceAvailable:boolean;
 unavailable:NotificationCategory[];
 checkedAt:string;
};

// Cada novo ciclo de relacionamento, data de vencimento ou gravidade merece um novo aviso.
export function notificationReadKey(item:AntaresNotification):string{
 const id=item.id.slice(item.id.indexOf(':')+1).toLowerCase();
 const stage=item.category==='opportunities'
  ?'pending'
  :item.category==='loyalty'
   ?item.priority==='high'?'critical':'warning'
   :item.status;
 const suffix=item.category==='opportunities'||!item.date?'':':'+item.date.slice(0,10);
 return item.category+':'+id+':'+stage+suffix;
}
