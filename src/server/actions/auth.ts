'use server';

import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit/log';
import { action } from '@/lib/server-action';
import {
  loginSchema,
  signupOrgSchema,
  signupPatientSchema,
} from '@/lib/zod/auth';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'practice';
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let suffix = 1;
  while (await db.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

export const login = action({
  schema: loginSchema,
  async handler({ email, password }) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user) {
      throw new Error(error?.message ?? 'Unable to sign in');
    }
    const dbUser = await db.user.findUnique({
      where: { supabaseUserId: data.user.id },
    });
    if (!dbUser || !dbUser.isActive) {
      await supabase.auth.signOut();
      throw new Error('Account not provisioned or has been deactivated.');
    }
    await audit({
      organizationId: dbUser.organizationId,
      userId: dbUser.id,
      action: 'LOGIN',
      resourceType: 'User',
      resourceId: dbUser.id,
    });
    return { userId: dbUser.id, role: dbUser.role };
  },
});

export const signupOrg = action({
  schema: signupOrgSchema,
  async handler(input) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          intent: 'owner',
        },
      },
    });
    if (error || !data.user) {
      throw new Error(error?.message ?? 'Sign-up failed');
    }

    const slug = await ensureUniqueSlug(slugify(input.organizationName));

    const org = await db.organization.create({
      data: {
        name: input.organizationName,
        slug,
        locations: {
          create: {
            name: `${input.organizationName}, Main`,
            shortName: 'Main',
            isPrimary: true,
          },
        },
        subscription: {
          create: {
            plan: 'PRACTICE',
            pendingPlan: 'PRACTICE',
            billingStatus: 'INACTIVE',
            providerSeatLimit: 10,
            locationSeatLimit: 3,
          },
        },
      },
    });

    const user = await db.user.create({
      data: {
        supabaseUserId: data.user.id,
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        role: Role.OWNER,
        organizationId: org.id,
        defaultOrganizationId: org.id,
        memberships: {
          create: {
            organizationId: org.id,
            role: Role.OWNER,
            isPrimary: true,
          },
        },
      },
    });

    await audit({
      organizationId: org.id,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'Organization',
      resourceId: org.id,
      metadata: { slug, subscription: 'INACTIVE' },
    });

    return { organizationId: org.id, slug, userId: user.id };
  },
});

export const signupPatient = action({
  schema: signupPatientSchema,
  async handler(input) {
    const org = await db.organization.findUnique({
      where: { slug: input.organizationSlug },
    });
    if (!org) throw new Error('Practice not found for that link');

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          intent: 'patient',
          orgSlug: input.organizationSlug,
        },
      },
    });
    if (error || !data.user) {
      throw new Error(error?.message ?? 'Sign-up failed');
    }

    const user = await db.user.create({
      data: {
        supabaseUserId: data.user.id,
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        role: Role.PATIENT,
        organizationId: org.id,
        defaultOrganizationId: org.id,
        memberships: {
          create: {
            organizationId: org.id,
            role: Role.PATIENT,
            isPrimary: true,
          },
        },
      },
    });

    const patient = await db.patient.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.toLowerCase(),
        dateOfBirth: input.dateOfBirth,
      },
    });

    await audit({
      organizationId: org.id,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'Patient',
      resourceId: patient.id,
      metadata: { selfService: true },
    });

    return { userId: user.id, patientId: patient.id };
  },
});

export async function signOut() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Continue to login even if Supabase is unreachable
  }
  redirect('/login');
}
