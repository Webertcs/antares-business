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
export type NotificationFeed = {
 items:AntaresNotification[];
 history:AntaresNotification[];
 count:number;
 opportunitiesCount:number;
 unavailable:NotificationCategory[];
 checkedAt:string;
};
