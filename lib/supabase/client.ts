'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for use in Client Components.
 * Fallbacks prevent build failures when env vars are missing during CI/Vercel build phase.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createBrowserClient(url, anonKey);
}
