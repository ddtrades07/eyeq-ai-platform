'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { audit } from '@/lib/audit/log';
import { ensureDemoMode, resetDemoMode } from '@/lib/demo/provision';
import { DEMO_ORG_SLUG } from '@/lib/demo/constants';
import {
  DEMO_PASSWORD,
  DEMO_ROLE_ACCOUNTS,
  type DemoRoleKey,
} from '@/lib/demo/accounts';
import {
  demoEmailForRole,
  demoRedirectForRole,
} from '@/lib/demo/auth-users';

export type DemoActionResult =
  | { ok: true; redirect: string }
  | { ok: false; error: string };

const roleKeySchema = z.enum([
  'owner',
  'optometrist',
  'technician',
  'frontdesk',
  'billing',
  'optical',
  'admin',
  'patient',
]);

async function signInDemoEmail(email: string): Promise<DemoActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: DEMO_PASSWORD,
  });
  if (error || !data.user) {
    return { ok: false, error: error?.message ?? 'Could not start the demo.' };
  }

  const dbUser = await db.user.findUnique({ where: { supabaseUserId: data.user.id } });
  if (dbUser) {
    await audit({
      organizationId: dbUser.organizationId,
      userId: dbUser.id,
      action: 'LOGIN',
      resourceType: 'User',
      resourceId: dbUser.id,
      metadata: { mode: 'demo', email },
    });
  }

  return { ok: true, redirect: '/' };
}

/** Default demo entry (owner). */
export async function enterDemoMode(): Promise<DemoActionResult> {
  const { serverEnv } = await import('@/lib/env');
  if (!serverEnv.demoModeEnabled) {
    return { ok: false, error: 'Demo mode is disabled in this environment.' };
  }
  try {
    await ensureDemoMode();
    const result = await signInDemoEmail(demoEmailForRole('owner'));
    if (!result.ok) return result;
    return { ok: true, redirect: demoRedirectForRole('owner') };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Demo provisioning failed.';
    console.error('[demo] enterDemoMode failed', err);
    return { ok: false, error: message };
  }
}

export async function enterDemoAsRole(rawKey: string): Promise<DemoActionResult> {
  const { serverEnv } = await import('@/lib/env');
  if (!serverEnv.demoModeEnabled) {
    return { ok: false, error: 'Demo mode is disabled in this environment.' };
  }

  const parsed = roleKeySchema.safeParse(rawKey);
  if (!parsed.success) {
    return { ok: false, error: 'Unknown demo role.' };
  }

  try {
    await ensureDemoMode();
    const email = demoEmailForRole(parsed.data);
    const signIn = await signInDemoEmail(email);
    if (!signIn.ok) return signIn;
    return { ok: true, redirect: demoRedirectForRole(parsed.data) };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Demo provisioning failed.';
    console.error('[demo] enterDemoAsRole failed', err);
    return { ok: false, error: message };
  }
}

/** Switch demo persona without leaving demo mode. Demo org only. */
export async function switchDemoRole(rawKey: string): Promise<DemoActionResult> {
  const { serverEnv } = await import('@/lib/env');
  if (!serverEnv.demoModeEnabled) {
    return { ok: false, error: 'Demo role switching is disabled.' };
  }

  const user = await getCurrentUser();
  if (!user || user.organizationSlug !== DEMO_ORG_SLUG) {
    return { ok: false, error: 'Role switching is only available in the demo environment.' };
  }

  return enterDemoAsRole(rawKey);
}

export async function resetDemoModeAction(): Promise<DemoActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, error: 'You must be signed in to reset the demo.' };
    }
    if (user.organizationSlug !== DEMO_ORG_SLUG) {
      return {
        ok: false,
        error: 'Reset is only available while in the demo organization.',
      };
    }
    await resetDemoMode();
    await audit({
      organizationId: user.organizationId ?? null,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'Organization',
      resourceId: user.organizationId ?? null,
      metadata: { event: 'demo_reset' },
    });
    revalidatePath('/', 'layout');
    return { ok: true, redirect: '/provider/demo-walkthrough' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Demo reset failed.';
    console.error('[demo] resetDemoMode failed', err);
    return { ok: false, error: message };
  }
}

export async function listDemoRolesForUi() {
  const { serverEnv } = await import('@/lib/env');
  if (!serverEnv.demoModeEnabled) return [];
  return DEMO_ROLE_ACCOUNTS.map(({ key, title, description, workflows }) => ({
    key,
    title,
    description,
    workflows,
  }));
}
