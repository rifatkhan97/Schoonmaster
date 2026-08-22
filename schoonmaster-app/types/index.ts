// =============================================================================
// Schoonmaster Platform — Global Type Definitions
// =============================================================================

export type UserRole = 'ADM' | 'MGR' | 'CLN' | 'AUD';

export type MaterialRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'REJECTED'
  | 'FULFILLED';

export type IncidentStatus = 'SENT' | 'SEEN' | 'RESOLVED';

export type IncidentCategory =
  | 'EQUIPMENT_BROKEN'
  | 'MISSING_KEY_ACCESS'
  | 'SAFETY_CONCERN'
  | 'AREA_INACCESSIBLE'
  | 'OTHER';

export type PaymentMethod =
  | 'ONLINE_CARD'
  | 'ONLINE_IDEAL'
  | 'CASH_ON_DELIVERY'
  | 'CASH_PICKUP';

export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

export type OrderItemType = 'SERVICE' | 'PRODUCT';

// -------------------------------------------------------
// Database row types (mirrors Supabase schema)
// -------------------------------------------------------

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  is_active: boolean;
  push_token?: string;
  created_at: string;
  updated_at: string;
  // joined from auth.users
  email?: string;
}

export interface Site {
  id: string;
  tenant_id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  sop_procedures?: string;
  sop_safety?: string;
  sop_dos_donts?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplate {
  id: string;
  site_id: string;
  tenant_id: string;
  task_text: string;
  sort_order: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

export interface Shift {
  id: string;
  tenant_id: string;
  site_id: string;
  cleaner_id: string;
  starts_at: string;
  ends_at: string;
  notes?: string;
  published: boolean;
  published_at?: string;
  published_by?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // joined
  site?: Site;
  cleaner?: User;
}

export interface ChecklistCompletion {
  id: string;
  shift_id: string;
  template_id: string;
  cleaner_id: string;
  tenant_id: string;
  is_checked: boolean;
  checked_at?: string;
  client_timestamp?: string;
  synced_at?: string;
  // joined
  template?: ChecklistTemplate;
}

export interface MaterialCatalogItem {
  id: string;
  tenant_id: string;
  name: string;
  unit: string;
  description?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialRequestItem {
  catalog_id: string;
  name: string;
  unit: string;
  quantity_requested: number;
  quantity_approved?: number;
  approved?: boolean;
}

export interface MaterialRequest {
  id: string;
  tenant_id: string;
  cleaner_id: string;
  site_id?: string;
  status: MaterialRequestStatus;
  items: MaterialRequestItem[];
  notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  // joined
  cleaner?: User;
  site?: Site;
}

export interface Unavailability {
  id: string;
  cleaner_id: string;
  tenant_id: string;
  date_from: string;
  date_to: string;
  reason?: string;
  created_at: string;
}

export interface Incident {
  id: string;
  tenant_id: string;
  cleaner_id: string;
  site_id?: string;
  category: IncidentCategory;
  notes?: string;
  image_url?: string;
  image_expires_at?: string;
  status: IncidentStatus;
  seen_by?: string;
  seen_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
  // joined
  cleaner?: User;
  site?: Site;
}

export interface Announcement {
  id: string;
  tenant_id: string;
  title: string;
  body: string;
  target_role?: UserRole;
  created_by: string;
  created_at: string;
  // computed
  read_at?: string;
  total_reads?: number;
}

export interface AnnouncementRead {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
  // joined
  user?: User;
}

export interface AuditLog {
  id: string;
  tenant_id?: string;
  user_id?: string;
  user_role?: UserRole;
  action: string;
  payload: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  // joined
  user?: User;
}

export interface ProductCatalogItem {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  price_cents: number;
  unit: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceCatalogItem {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  base_price_cents: number;
  duration_hours?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  type: OrderItemType;
  catalog_id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  // for services:
  service_address?: string;
  service_date?: string;
  service_instructions?: string;
}

export interface Order {
  id: string;
  tenant_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  delivery_address?: string;
  items: OrderItem[];
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  mollie_order_id?: string;
  mollie_checkout_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// -------------------------------------------------------
// Auth & Session types
// -------------------------------------------------------
export interface AuthSession {
  userId: string;
  tenantId: string;
  role: UserRole;
  email: string;
  fullName: string;
}

// -------------------------------------------------------
// Cart types (client-side only)
// -------------------------------------------------------
export interface CartItem {
  id: string; // catalog_id
  type: OrderItemType;
  name: string;
  quantity: number;
  unit_price_cents: number;
  // for services:
  service_address?: string;
  service_date?: string;
  service_instructions?: string;
}

// -------------------------------------------------------
// Dashboard KPI type
// -------------------------------------------------------
export interface DashboardKPIs {
  active_projects: number;
  total_staff: number;
  pending_supply_requests: number;
  unresolved_incidents: number;
}

// -------------------------------------------------------
// Offline sync types
// -------------------------------------------------------
export interface OfflineChecklistAction {
  type: 'CHECKLIST_TOGGLE';
  shiftId: string;
  templateId: string;
  isChecked: boolean;
  clientTimestamp: string;
}
