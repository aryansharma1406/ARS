export type UserRole = 'customer' | 'staff' | 'promoter' | 'venue_owner' | 'admin' | 'super_admin';

export interface VenueOwner {
  id: string;
  user_id: string;
  venue_id: string;
  role: 'owner' | 'manager';
  active: boolean;
  created_at: string;
}

export interface VenueStaffAssignment {
  id: string;
  user_id: string;
  venue_id: string;
  event_id?: string;
  gate_name?: string;
  active: boolean;
  created_at: string;
}

export interface AuditLog {
  actor_role: UserRole;
  id: string;
  actor_user_id: string;
  venue_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface Venue {
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  id: string;
  name: string;
  location: string;
  address: string;
  description: string;
  image: string;
  commission_percentage: number;
  active: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  venue_id: string;
  venue_name?: string;
  name: string;
  description: string;
  image: string;
  category: string;
  date: string;
  start_time: string;
  end_time: string;
  ticket_price: number;
  ticket_capacity: number;
  tickets_sold: number;
  age_limit: number;
  published: boolean;
  created_at: string;
}

export interface Source {
  id: string;
  venue_id: string;
  name: string;
  code: string;
  commission_percentage: number;
  active: boolean;
  created_at: string;
}

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type TicketStatus = 'VALID' | 'USED' | 'PAYMENT_FAILED' | 'REFUNDED';

export interface Order {
  original_subtotal?: number;
  discount_amount?: number;
  coupon_code?: string | null;
  id: string;
  customer_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  event_id: string;
  source_code?: string;
  quantity: number;
  ticket_type: string;
  subtotal: number;
  fees: number;
  total: number;
  payment_status: PaymentStatus;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  order_id: string;
  event_id: string;
  event_name?: string;
  venue_name?: string;
  customer_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  source_code?: string;
  qr_token: string;
  status: TicketStatus;
  ticket_type: string;
  scanned_at?: string;
  scanned_by?: string;
  created_at: string;
}

export interface Scan {
  id: string;
  ticket_id: string;
  staff_id: string;
  venue_id: string;
  event_id: string;
  scanned_at: string;
  result: 'VALID' | 'ALREADY_USED' | 'INVALID';
}

export interface Settlement {
  id: string;
  venue_id: string;
  venue_name?: string;
  event_id: string;
  event_name?: string;
  gross_revenue: number;
  refunds: number;
  eligible_revenue: number;
  commission_percentage: number;
  commission_amount: number;
  venue_amount: number;
  status: 'PENDING' | 'SETTLED';
  created_at: string;
}

export interface PromoterAttributionReport {
  source_code: string;
  promoter_name: string;
  venue_name: string;
  tickets_sold: number;
  gross_entry_revenue: number;
  commission_percentage: number;
  commission_payable: number;
}
