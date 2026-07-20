import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';

/**
 * Server-side Supabase client backed by the Next.js cookie store.
 * Use inside Server Components, Server Actions, Route Handlers, and middleware.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = publicEnv.supabaseUrl || 'http://localhost:0';
  const key = publicEnv.supabaseAnonKey || 'placeholder';

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions),
            );
          } catch {
            // setAll throws when called from a Server Component. Middleware
            // refresh handles that case before the request reaches a RSC.
          }
        },
      },
    },
  );
}
