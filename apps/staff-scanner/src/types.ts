export type Assignment={id:string;venue_id:string;venue_name:string;event_id:string|null;event_name:string|null;gate_name:string};
export type StaffContext={staff_id:string;name:string;assignments:Assignment[]};
export type Stats={checked_in:number;remaining:number;capacity:number;event_count:number;as_of:string;date:string;scope:string};
export type ScanResult={result:'VALID'|'ALREADY_USED'|'INVALID';message:string;request_id:string;recorded_at:string;replayed:boolean;ticket?:{id:string;customer_name:string;event_name:string;venue_name:string;ticket_type:string;status:string;scanned_at:string|null}};
export type PendingScan={requestId:string;assignmentId:string;token:string};
