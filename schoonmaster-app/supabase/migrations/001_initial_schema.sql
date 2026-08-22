-- =============================================================================
-- SCHOONMASTER PLATFORM — PostgreSQL Database Schema
-- Multi-tenant, GDPR-compliant, RBAC-enforced via Supabase RLS
-- Run in Supabase SQL Editor (or migrate via supabase CLI)
-- =============================================================================

-- -------------------------------------------------------
-- EXTENSIONS
-- -------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------
-- TYPES / ENUMS
-- -------------------------------------------------------
CREATE TYPE user_role AS ENUM ('ADM', 'MGR', 'CLN', 'AUD');
CREATE TYPE material_request_status AS ENUM ('PENDING', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'FULFILLED');
CREATE TYPE incident_status AS ENUM ('SENT', 'SEEN', 'RESOLVED');
CREATE TYPE incident_category AS ENUM ('EQUIPMENT_BROKEN', 'MISSING_KEY_ACCESS', 'SAFETY_CONCERN', 'AREA_INACCESSIBLE', 'OTHER');
CREATE TYPE payment_method AS ENUM ('ONLINE_CARD', 'ONLINE_IDEAL', 'CASH_ON_DELIVERY', 'CASH_PICKUP');
CREATE TYPE payment_status AS ENUM ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');
CREATE TYPE order_item_type AS ENUM ('SERVICE', 'PRODUCT');
CREATE TYPE audit_action AS ENUM (
  'USER_LOGIN', 'USER_LOGOUT', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_COMPLETE',
  'SHIFT_CREATE', 'SHIFT_UPDATE', 'SHIFT_DELETE', 'SHIFT_PUBLISH',
  'CHECKLIST_TOGGLE', 'MATERIAL_REQUEST_CREATE', 'MATERIAL_REQUEST_STATUS_CHANGE',
  'INCIDENT_CREATE', 'INCIDENT_SEEN', 'INCIDENT_RESOLVE',
  'ANNOUNCEMENT_CREATE', 'ANNOUNCEMENT_READ',
  'SITE_CREATE', 'SITE_UPDATE', 'SITE_DELETE',
  'USER_CREATE', 'USER_UPDATE', 'USER_DEACTIVATE',
  'ORDER_CREATE', 'ORDER_PAYMENT_UPDATE',
  'CATALOG_ITEM_CREATE', 'CATALOG_ITEM_UPDATE',
  'GDPR_EXPORT', 'GDPR_DELETE'
);

-- -------------------------------------------------------
-- TABLE: tenants (multi-tenant root)
-- -------------------------------------------------------
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,           -- used in white-label routing
  plan          TEXT NOT NULL DEFAULT 'starter', -- starter | professional | enterprise
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- TABLE: users (all internal staff — NOT guest customers)
-- -------------------------------------------------------
-- NOTE: Supabase Auth manages credentials. This table stores profile + role.
CREATE TABLE users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'CLN',
  full_name     TEXT NOT NULL,
  phone         TEXT,                           -- optional contact
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  push_token    TEXT,                           -- FCM registration token
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);

-- -------------------------------------------------------
-- TABLE: sites (project locations / cleaning sites)
-- -------------------------------------------------------
CREATE TABLE sites (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  address       TEXT NOT NULL,
  lat           DECIMAL(10, 8),
  lng           DECIMAL(11, 8),
  sop_procedures      TEXT,                    -- Cleaning Procedures section
  sop_safety          TEXT,                    -- Safety Protocols section
  sop_dos_donts       TEXT,                    -- Do's & Don'ts section
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sites_tenant ON sites(tenant_id);

-- -------------------------------------------------------
-- TABLE: checklist_templates (per-site task definitions)
-- -------------------------------------------------------
CREATE TABLE checklist_templates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id       UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_text     TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklist_templates_site ON checklist_templates(site_id);

-- -------------------------------------------------------
-- TABLE: shifts (scheduled cleaner assignments)
-- -------------------------------------------------------
CREATE TABLE shifts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id       UUID NOT NULL REFERENCES sites(id),
  cleaner_id    UUID NOT NULL REFERENCES users(id),
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ NOT NULL,
  notes         TEXT,
  published     BOOLEAN NOT NULL DEFAULT FALSE,
  published_at  TIMESTAMPTZ,
  published_by  UUID REFERENCES users(id),
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT shifts_time_check CHECK (ends_at > starts_at)
);

CREATE INDEX idx_shifts_tenant ON shifts(tenant_id);
CREATE INDEX idx_shifts_cleaner ON shifts(cleaner_id);
CREATE INDEX idx_shifts_site ON shifts(site_id);
CREATE INDEX idx_shifts_starts_at ON shifts(starts_at);

-- -------------------------------------------------------
-- TABLE: checklist_completions (immutable per-cleaner state)
-- -------------------------------------------------------
CREATE TABLE checklist_completions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id        UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  template_id     UUID NOT NULL REFERENCES checklist_templates(id),
  cleaner_id      UUID NOT NULL REFERENCES users(id),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  is_checked      BOOLEAN NOT NULL DEFAULT FALSE,
  checked_at      TIMESTAMPTZ,                 -- NULL when unchecked
  client_timestamp TIMESTAMPTZ,               -- offline sync: cleaner's local time
  synced_at       TIMESTAMPTZ,               -- when server received offline sync
  UNIQUE(shift_id, template_id, cleaner_id)
);

CREATE INDEX idx_completions_shift ON checklist_completions(shift_id);
CREATE INDEX idx_completions_cleaner ON checklist_completions(cleaner_id);

-- -------------------------------------------------------
-- TABLE: material_catalog (inventory item definitions)
-- -------------------------------------------------------
CREATE TABLE material_catalog (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  unit          TEXT NOT NULL,                 -- e.g., "bottles", "rolls", "kg"
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_material_catalog_tenant ON material_catalog(tenant_id);

-- -------------------------------------------------------
-- TABLE: material_requests (cleaner supply requisitions)
-- -------------------------------------------------------
CREATE TABLE material_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cleaner_id    UUID NOT NULL REFERENCES users(id),
  site_id       UUID REFERENCES sites(id),
  status        material_request_status NOT NULL DEFAULT 'PENDING',
  items         JSONB NOT NULL,               -- [{catalog_id, name, quantity_requested, quantity_approved, approved}]
  notes         TEXT,
  resolved_by   UUID REFERENCES users(id),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_material_requests_tenant ON material_requests(tenant_id);
CREATE INDEX idx_material_requests_cleaner ON material_requests(cleaner_id);
CREATE INDEX idx_material_requests_status ON material_requests(status);

-- -------------------------------------------------------
-- TABLE: unavailability (cleaner availability blocks)
-- -------------------------------------------------------
CREATE TABLE unavailability (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cleaner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date_from     TIMESTAMPTZ NOT NULL,
  date_to       TIMESTAMPTZ NOT NULL,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unavailability_time_check CHECK (date_to > date_from)
);

CREATE INDEX idx_unavailability_cleaner ON unavailability(cleaner_id);
CREATE INDEX idx_unavailability_dates ON unavailability(date_from, date_to);

-- -------------------------------------------------------
-- TABLE: incidents (field issue reports)
-- -------------------------------------------------------
CREATE TABLE incidents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cleaner_id    UUID NOT NULL REFERENCES users(id),
  site_id       UUID REFERENCES sites(id),
  category      incident_category NOT NULL,
  notes         TEXT,
  image_url     TEXT,                         -- Supabase Storage URL
  image_expires_at TIMESTAMPTZ,              -- GDPR purge date (created_at + retention days)
  status        incident_status NOT NULL DEFAULT 'SENT',
  seen_by       UUID REFERENCES users(id),
  seen_at       TIMESTAMPTZ,
  resolved_by   UUID REFERENCES users(id),
  resolved_at   TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_tenant ON incidents(tenant_id);
CREATE INDEX idx_incidents_cleaner ON incidents(cleaner_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_image_expires ON incidents(image_expires_at) WHERE image_url IS NOT NULL;

-- -------------------------------------------------------
-- TABLE: announcements (broadcast messages)
-- -------------------------------------------------------
CREATE TABLE announcements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  target_role   user_role,                    -- NULL = all roles
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_tenant ON announcements(tenant_id);
CREATE INDEX idx_announcements_created ON announcements(created_at DESC);

-- -------------------------------------------------------
-- TABLE: announcement_reads (immutable read receipts)
-- -------------------------------------------------------
CREATE TABLE announcement_reads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)             -- one receipt per user per announcement
);

CREATE INDEX idx_announcement_reads_announcement ON announcement_reads(announcement_id);
CREATE INDEX idx_announcement_reads_user ON announcement_reads(user_id);

-- -------------------------------------------------------
-- TABLE: audit_logs (append-only immutable trail)
-- -------------------------------------------------------
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID REFERENCES tenants(id),
  user_id       UUID,                         -- nullable: system actions
  user_role     user_role,
  action        audit_action NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}',
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()  -- microsecond precision via NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Prevent updates/deletes on audit_logs (append-only enforcement)
CREATE OR REPLACE RULE audit_logs_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE OR REPLACE RULE audit_logs_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- -------------------------------------------------------
-- TABLE: product_catalog (public store physical supplies)
-- -------------------------------------------------------
CREATE TABLE product_catalog (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  price_cents   INTEGER NOT NULL CHECK (price_cents >= 0),
  unit          TEXT NOT NULL DEFAULT 'piece',
  image_url     TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_catalog_tenant ON product_catalog(tenant_id);

-- -------------------------------------------------------
-- TABLE: service_catalog (bookable cleaning services)
-- -------------------------------------------------------
CREATE TABLE service_catalog (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  base_price_cents INTEGER NOT NULL CHECK (base_price_cents >= 0),
  duration_hours  DECIMAL(4,1),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_catalog_tenant ON service_catalog(tenant_id);

-- -------------------------------------------------------
-- TABLE: orders (guest ecommerce orders)
-- -------------------------------------------------------
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_name   TEXT NOT NULL,
  customer_email  TEXT NOT NULL,
  customer_phone  TEXT,
  delivery_address TEXT,
  items           JSONB NOT NULL,             -- [{type, catalog_id, name, qty, unit_price_cents, ...service_details}]
  subtotal_cents  INTEGER NOT NULL,
  tax_cents       INTEGER NOT NULL,           -- 21% BTW
  total_cents     INTEGER NOT NULL,
  payment_method  payment_method NOT NULL,
  payment_status  payment_status NOT NULL DEFAULT 'PENDING',
  mollie_order_id TEXT UNIQUE,
  mollie_checkout_url TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_email ON orders(customer_email);
CREATE INDEX idx_orders_mollie ON orders(mollie_order_id);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);

-- -------------------------------------------------------
-- TABLE: telemetry_events (MAU + usage metering)
-- -------------------------------------------------------
CREATE TABLE telemetry_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,               -- 'SESSION_START', 'ORDER_PLACED', 'SHIFT_VIEWED', etc.
  user_id       UUID,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_telemetry_tenant_month ON telemetry_events(tenant_id, date_trunc('month', created_at));
CREATE INDEX idx_telemetry_event_type ON telemetry_events(event_type);

-- -------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's tenant_id from JWT
CREATE OR REPLACE FUNCTION auth.user_tenant_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::UUID;
$$;

-- Helper function: get current user's role from JWT
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT auth.jwt() ->> 'role';
$$;

-- USERS: tenant-isolated; ADM sees all in tenant, others see themselves
CREATE POLICY users_tenant_isolation ON users
  USING (tenant_id = auth.user_tenant_id());

-- SHIFTS: tenant-isolated; CLN sees only their own shifts
CREATE POLICY shifts_tenant_isolation ON shifts
  USING (
    tenant_id = auth.user_tenant_id()
    AND (auth.user_role() IN ('ADM', 'MGR', 'AUD') OR cleaner_id = auth.uid())
  );

-- SITES: tenant-isolated read for all internal roles
CREATE POLICY sites_tenant_isolation ON sites
  USING (tenant_id = auth.user_tenant_id());

-- CHECKLIST_TEMPLATES: tenant-isolated read
CREATE POLICY checklist_templates_tenant ON checklist_templates
  USING (tenant_id = auth.user_tenant_id());

-- CHECKLIST_COMPLETIONS: CLN owns their own; ADM/MGR see all in tenant
CREATE POLICY completions_tenant ON checklist_completions
  USING (
    tenant_id = auth.user_tenant_id()
    AND (auth.user_role() IN ('ADM', 'MGR', 'AUD') OR cleaner_id = auth.uid())
  );

-- MATERIAL_CATALOG: tenant-isolated
CREATE POLICY material_catalog_tenant ON material_catalog
  USING (tenant_id = auth.user_tenant_id());

-- MATERIAL_REQUESTS: CLN sees own; ADM/MGR see all in tenant
CREATE POLICY material_requests_tenant ON material_requests
  USING (
    tenant_id = auth.user_tenant_id()
    AND (auth.user_role() IN ('ADM', 'MGR') OR cleaner_id = auth.uid())
  );

-- UNAVAILABILITY: CLN sees own; ADM/MGR see all
CREATE POLICY unavailability_tenant ON unavailability
  USING (
    tenant_id = auth.user_tenant_id()
    AND (auth.user_role() IN ('ADM', 'MGR') OR cleaner_id = auth.uid())
  );

-- INCIDENTS: CLN sees own; ADM/MGR see all in tenant
CREATE POLICY incidents_tenant ON incidents
  USING (
    tenant_id = auth.user_tenant_id()
    AND (auth.user_role() IN ('ADM', 'MGR', 'AUD') OR cleaner_id = auth.uid())
  );

-- ANNOUNCEMENTS: all internal users in tenant can read
CREATE POLICY announcements_tenant ON announcements
  USING (tenant_id = auth.user_tenant_id());

-- ANNOUNCEMENT_READS: user sees own receipts; ADM sees all
CREATE POLICY announcement_reads_tenant ON announcement_reads
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      WHERE a.id = announcement_id AND a.tenant_id = auth.user_tenant_id()
    )
    AND (auth.user_role() = 'ADM' OR user_id = auth.uid())
  );

-- AUDIT_LOGS: ADM and AUD can read within tenant
CREATE POLICY audit_logs_read ON audit_logs
  FOR SELECT USING (
    tenant_id = auth.user_tenant_id()
    AND auth.user_role() IN ('ADM', 'AUD')
  );

-- PRODUCT_CATALOG: public read (no auth needed for store browsing)
CREATE POLICY product_catalog_public_read ON product_catalog
  FOR SELECT USING (is_active = TRUE);

-- SERVICE_CATALOG: public read
CREATE POLICY service_catalog_public_read ON service_catalog
  FOR SELECT USING (is_active = TRUE);

-- ORDERS: public insert (guest checkout); no public read
CREATE POLICY orders_insert ON orders
  FOR INSERT WITH CHECK (TRUE);

-- -------------------------------------------------------
-- FUNCTIONS: updated_at auto-trigger
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_sites BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_shifts BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_material_catalog BEFORE UPDATE ON material_catalog FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_material_requests BEFORE UPDATE ON material_requests FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_orders BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_product_catalog BEFORE UPDATE ON product_catalog FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_service_catalog BEFORE UPDATE ON service_catalog FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- -------------------------------------------------------
-- SEED: Default tenant for Schoonmaster BV
-- -------------------------------------------------------
INSERT INTO tenants (id, name, slug, plan) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Schoonmaster BV', 'schoonmaster', 'professional');
