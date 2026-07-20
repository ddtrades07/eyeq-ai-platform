import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { publicEnv } from '@/lib/env';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Refreshes the Supabase session cookie on every request and returns a
 * response with the up-to-date Set-Cookie headers. Always return this
 * exact response from middleware, calling `NextResponse.next()` again
 * will drop the refreshed cookies.
 *
 * If Supabase env vars are not configured (demo / preview mode), we
 * skip the auth bootstrap entirely and report `user = null`. Auth-gated
 * routes will then redirect to `/login` as usual.
 */
export async function updateSession(request: NextRequest) {
  const supabaseResponseBase = NextResponse.next({ request });

  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    return { response: supabaseResponseBase, user: null };
  }

  let supabaseResponse = supabaseResponseBase;

  const supabase = createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Trigger a refresh if the session is stale.
  // Wrap in try/catch so a paused/unreachable Supabase project doesn't crash the app.
  try {
    const { data } = await supabase.auth.getUser();
    return { response: supabaseResponse, user: data.user };
  } catch {
    return { response: supabaseResponse, user: null };
  }
}
