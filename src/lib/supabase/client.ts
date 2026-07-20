'use client';

import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';

let cached: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Browser-side Supabase client. Memoised so we don't reconnect on every
 * call. Use this for client-side mutations (sign-out, password reset).
 */
export function createSupabaseBrowserClient() {
  if (cached) return cached;
  const url = publicEnv.supabaseUrl || 'http://localhost:0';
  const key = publicEnv.supabaseAnonKey || 'placeholder';
  cached = createBrowserClient(url, key);
  return cached;
}
