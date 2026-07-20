import { cache } from 'react';
import type { Role, User } from '@prisma/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { publicEnv } from '@/lib/env';

export type SessionUser = {
  /** Supabase auth UID. */
  authId: string;
  /** Internal `User.id` once provisioned. */
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  organizationId: string | null;
  organizationSlug: string | null;
  organizationName: string | null;
  raw: User;
};

/**
 * Resolves the currently authenticated EyeQ user, joining the Supabase
 * Auth session with our internal `User` row. Returns `null` when the
 * session is missing or the user has been deactivated. Cached per request
 * to avoid duplicate DB lookups across nested server components.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) return null;

  let auth: Awaited<ReturnType<typeof getSupabaseUser>> | null = null;
  try {
    auth = await getSupabaseUser();
  } catch {
    return null;
  }
  if (!auth?.user) return null;

  let dbUser:
    | (User & { organization: { id: string; slug: string; name: string } | null })
    | null = null;
  try {
    dbUser = await db.user.findUnique({
      where: { supabaseUserId: auth.user.id },
      include: { organization: { select: { id: true, slug: true, name: true } } },
    });
  } catch {
    return null;
  }
  if (!dbUser || !dbUser.isActive) return null;

  return {
    authId: auth.user.id,
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    role: dbUser.role,
    organizationId: dbUser.organization?.id ?? null,
    organizationSlug: dbUser.organization?.slug ?? null,
    organizationName: dbUser.organization?.name ?? null,
    raw: dbUser,
  };
});

async function getSupabaseUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data;
}

/**
 * Marks the user as recently seen. Best-effort; never blocks render.
 */
export async function touchLastSeen(userId: string) {
  try {
    await db.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
  } catch {
    // ignore, best-effort heartbeat
  }
}
