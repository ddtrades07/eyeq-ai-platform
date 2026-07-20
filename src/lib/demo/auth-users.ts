import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { Role } from '@prisma/client';
import { db } from '@/lib/db';
import { publicEnv, serverEnv } from '@/lib/env';
import {
  DEMO_LEGACY_OWNER_EMAIL,
  DEMO_PASSWORD,
  DEMO_ROLE_ACCOUNTS,
  type DemoRoleKey,
} from './accounts';

function adminSupabase() {
  if (!publicEnv.supabaseUrl || !serverEnv.supabaseServiceRoleKey) {
    throw new Error(
      'Supabase service-role credentials are not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable demo mode.',
    );
  }
  return createClient(publicEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Ensures every demo Supabase Auth user exists with the shared demo password. */
export async function ensureAllDemoAuthUsers(): Promise<Map<string, string>> {
  const supabase = adminSupabase();
  const emailToAuthId = new Map<string, string>();

  const emails = [
    ...DEMO_ROLE_ACCOUNTS.map((a) => a.email),
    DEMO_LEGACY_OWNER_EMAIL,
  ];

  const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 500 });
  if (list.error) throw new Error(list.error.message);

  for (const email of emails) {
    const normalized = email.toLowerCase();
    let authUser = list.data.users.find((u) => (u.email ?? '').toLowerCase() === normalized);

    if (!authUser) {
      const account = DEMO_ROLE_ACCOUNTS.find((a) => a.email.toLowerCase() === normalized);
      const created = await supabase.auth.admin.createUser({
        email: normalized,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name: account?.firstName ?? 'Demo',
          last_name: account?.lastName ?? 'User',
          demo: true,
        },
      });
      if (created.error || !created.data.user) {
        throw new Error(created.error?.message ?? `Failed to create demo auth user ${email}`);
      }
      authUser = created.data.user;
    } else {
      await supabase.auth.admin.updateUserById(authUser.id, {
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
    }

    emailToAuthId.set(normalized, authUser.id);
  }

  return emailToAuthId;
}

async function upsertDemoStaffUser(args: {
  organizationId: string;
  email: string;
  supabaseUserId: string;
  role: Role;
  firstName: string;
  lastName: string;
}) {
  const user = await db.user.upsert({
    where: { email: args.email },
    create: {
      supabaseUserId: args.supabaseUserId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      role: args.role,
      organizationId: args.organizationId,
      defaultOrganizationId: args.organizationId,
    },
    update: {
      supabaseUserId: args.supabaseUserId,
      firstName: args.firstName,
      lastName: args.lastName,
      role: args.role,
      organizationId: args.organizationId,
      defaultOrganizationId: args.organizationId,
      isActive: true,
    },
  });

  await db.organizationMembership.upsert({
    where: {
      userId_organizationId: { userId: user.id, organizationId: args.organizationId },
    },
    create: {
      userId: user.id,
      organizationId: args.organizationId,
      role: args.role,
      isPrimary: true,
    },
    update: { role: args.role, isPrimary: true },
  });

  return user;
}

/**
 * Upserts Prisma users for every demo role in the demo organization.
 * Links the patient portal user to the featured Michael Thompson demo
 * patient so the connected demo journey ends in his portal.
 */
export async function syncDemoPrismaUsers(
  organizationId: string,
  authByEmail: Map<string, string>,
): Promise<void> {
  for (const account of DEMO_ROLE_ACCOUNTS) {
    const supabaseUserId = authByEmail.get(account.email.toLowerCase());
    if (!supabaseUserId) continue;

    await upsertDemoStaffUser({
      organizationId,
      email: account.email,
      supabaseUserId,
      role: account.role,
      firstName: account.firstName,
      lastName: account.lastName,
    });
  }

  const legacyAuthId = authByEmail.get(DEMO_LEGACY_OWNER_EMAIL.toLowerCase());
  if (legacyAuthId) {
    await upsertDemoStaffUser({
      organizationId,
      email: DEMO_LEGACY_OWNER_EMAIL,
      supabaseUserId: legacyAuthId,
      role: Role.OWNER,
      firstName: 'Demo',
      lastName: 'Owner',
    });
  }

  const patientUser = await db.user.findUnique({
    where: { email: 'patient.demo@eyeq.local' },
  });
  if (patientUser) {
    const featured = await db.patient.findFirst({
      where: { organizationId, firstName: 'Michael', lastName: 'Thompson' },
    });
    if (featured && featured.userId !== patientUser.id) {
      await db.patient.update({
        where: { id: featured.id },
        data: { userId: patientUser.id },
      });
    }
  }
}

export function demoEmailForRole(key: DemoRoleKey): string {
  return DEMO_ROLE_ACCOUNTS.find((a) => a.key === key)!.email;
}

export function demoRedirectForRole(key: DemoRoleKey): string {
  return DEMO_ROLE_ACCOUNTS.find((a) => a.key === key)!.redirect;
}
