'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for use in Client Components.
 * The anon key is safe to expose publicly — RLS policies enforce access control.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
