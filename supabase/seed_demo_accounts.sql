-- ========================================================
-- SCHOONMASTER DEMO ACCOUNTS SEED SCRIPT
-- Paste this script into Supabase Dashboard -> SQL Editor to
-- immediately create demo accounts for all 4 role types.
-- All accounts use password: Password123!
-- ========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_tenant_id UUID := '00000000-0000-0000-0000-000000000001';
  v_encrypted_pw TEXT := crypt('Password123!', gen_salt('bf'));

  -- Fixed UUIDs for predictability
  v_admin_id UUID   := '11111111-1111-1111-1111-111111111111';
  v_manager_id UUID := '22222222-2222-2222-2222-222222222222';
  v_cleaner_id UUID := '33333333-3333-3333-3333-333333333333';
  v_auditor_id UUID := '44444444-4444-4444-4444-444444444444';
BEGIN
  -- 1. Ensure Tenant exists
  INSERT INTO public.tenants (id, name, slug, plan)
  VALUES (v_tenant_id, 'Schoonmaster BV', 'schoonmaster', 'professional')
  ON CONFLICT (id) DO NOTHING;

  -- 2. System Administrator (ADM)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
  ) VALUES (
    v_admin_id, '00000000-0000-0000-0000-000000000000', 'admin@schoonmaster.nl', v_encrypted_pw, NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Jan de Vries (Admin)"}', NOW(), NOW(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password;

  INSERT INTO public.users (id, tenant_id, full_name, role, phone_number, is_active)
  VALUES (v_admin_id, v_tenant_id, 'Jan de Vries (Admin)', 'ADM', '+31 6 1234 5678', true)
  ON CONFLICT (id) DO UPDATE SET role = 'ADM', is_active = true;

  -- 3. Operations Manager / Supervisor (MGR)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
  ) VALUES (
    v_manager_id, '00000000-0000-0000-0000-000000000000', 'manager@schoonmaster.nl', v_encrypted_pw, NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Sophie Bakhuizen (Manager)"}', NOW(), NOW(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password;

  INSERT INTO public.users (id, tenant_id, full_name, role, phone_number, is_active)
  VALUES (v_manager_id, v_tenant_id, 'Sophie Bakhuizen (Manager)', 'MGR', '+31 6 2345 6789', true)
  ON CONFLICT (id) DO UPDATE SET role = 'MGR', is_active = true;

  -- 4. Field Technician / Cleaner (CLN)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
  ) VALUES (
    v_cleaner_id, '00000000-0000-0000-0000-000000000000', 'cleaner@schoonmaster.nl', v_encrypted_pw, NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Lars van den Berg (Cleaner)"}', NOW(), NOW(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password;

  INSERT INTO public.users (id, tenant_id, full_name, role, phone_number, is_active)
  VALUES (v_cleaner_id, v_tenant_id, 'Lars van den Berg (Cleaner)', 'CLN', '+31 6 3456 7890', true)
  ON CONFLICT (id) DO UPDATE SET role = 'CLN', is_active = true;

  -- 5. Compliance Auditor (AUD)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
  ) VALUES (
    v_auditor_id, '00000000-0000-0000-0000-000000000000', 'auditor@schoonmaster.nl', v_encrypted_pw, NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Emma Hermans (Auditor)"}', NOW(), NOW(), 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password;

  INSERT INTO public.users (id, tenant_id, full_name, role, phone_number, is_active)
  VALUES (v_auditor_id, v_tenant_id, 'Emma Hermans (Auditor)', 'AUD', '+31 6 4567 8901', true)
  ON CONFLICT (id) DO UPDATE SET role = 'AUD', is_active = true;

END $$;
