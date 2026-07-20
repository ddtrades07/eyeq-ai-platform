import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { publicEnv } from '@/lib/env';

function clearSupabaseCookies(response: NextResponse, names: string[]) {
  for (const name of names) {
    if (name.startsWith('sb-')) {
      response.cookies.set(name, '', {
        path: '/',
        maxAge: 0,
        expires: new Date(0),
      });
    }
  }
}

async function endSession(): Promise<string[]> {
  const cookieStore = await cookies();
  const cookieNames = cookieStore.getAll().map((c) => c.name);

  if (publicEnv.supabaseUrl && publicEnv.supabaseAnonKey) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {
      // Supabase unreachable, still clear cookies below
    }
  }

  return cookieNames;
}

export async function POST() {
  const cookieNames = await endSession();
  const json = NextResponse.json({ ok: true });
  clearSupabaseCookies(json, cookieNames);
  return json;
}

/** Allows sign-out via navigation (e.g. bookmark or fallback link). */
export async function GET(request: Request) {
  const cookieNames = await endSession();
  const login = new URL('/login', request.url);
  const res = NextResponse.redirect(login);
  clearSupabaseCookies(res, cookieNames);
  return res;
}
