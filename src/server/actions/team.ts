'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';
import { isStaffRole } from '@/lib/auth/rbac';
import { publicEnv, serverEnv } from '@/lib/env';

const inviteSchema = z.object({
  email: z.string().email().max(200),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  role: z.nativeEnum(Role),
  // If true, generate a temporary password and return it so the inviter
  // can share it manually. If false, attempt a Supabase magic-link invite.
  generatePassword: z.coerce.boolean().default(true),
  credentials: z.string().max(40).optional().nullable(),
  npi: z.string().max(20).optional().nullable(),
});

function adminSupabase() {
  if (!publicEnv.supabaseUrl || !serverEnv.supabaseServiceRoleKey) {
    throw new Error(
      'Supabase service-role credentials are not configured. Cannot provision team members.',
    );
  }
  return createClient(publicEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function randomPassword() {
  // 16 char URL-safe-ish random, mixes upper/lower/digits/symbol.
  const chars =
    'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
  let out = '';
  // crypto.getRandomValues exists in Node 18+ via globalThis.
  const buf = new Uint32Array(16);
  crypto.getRandomValues(buf);
  for (let i = 0; i < buf.length; i++) {
    out += chars[buf[i] % chars.length];
  }
  return out;
}

export const inviteTeamMember = action({
  schema: inviteSchema,
  async handler(input) {
    const inviter = await assertPermission('users:manage');
    if (!inviter.organizationId) throw new Error('No organization context');

    if (!isStaffRole(input.role)) {
      throw new Error('Role is not a staff role.');
    }
    if (input.role === Role.OWNER && inviter.role !== Role.OWNER) {
      throw new Error('Only an existing OWNER can invite another OWNER.');
    }

    const email = input.email.trim().toLowerCase();
    const existingDbUser = await db.user.findUnique({ where: { email } });
    if (existingDbUser) {
      throw new Error('A user with that email already exists.');
    }

    const supabase = adminSupabase();
    const tempPassword = input.generatePassword ? randomPassword() : null;

    // Either generate a password (admin shares it) or send a magic invite.
    let authUserId: string;
    if (tempPassword) {
      const created = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: input.firstName,
          last_name: input.lastName,
          invited_by: inviter.id,
        },
      });
      if (created.error || !created.data.user) {
        throw new Error(
          created.error?.message ?? 'Supabase user creation failed.',
        );
      }
      authUserId = created.data.user.id;
    } else {
      const invited = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          first_name: input.firstName,
          last_name: input.lastName,
          invited_by: inviter.id,
        },
      });
      if (invited.error || !invited.data.user) {
        throw new Error(
          invited.error?.message ?? 'Supabase invite send failed.',
        );
      }
      authUserId = invited.data.user.id;
    }

    const user = await db.user.create({
      data: {
        supabaseUserId: authUserId,
        email,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        organizationId: inviter.organizationId,
        defaultOrganizationId: inviter.organizationId,
        isActive: true,
      },
    });

    await db.organizationMembership.create({
      data: {
        userId: user.id,
        organizationId: inviter.organizationId,
        role: input.role,
        isPrimary: true,
      },
    });

    const providerRoles: Role[] = [Role.OPTOMETRIST, Role.MD, Role.RESIDENT];
    if (providerRoles.includes(input.role)) {
      await db.provider.create({
        data: {
          organizationId: inviter.organizationId,
          userId: user.id,
          credentials: input.credentials ?? null,
          npi: input.npi ?? null,
        },
      });
    }

    await audit({
      organizationId: inviter.organizationId,
      userId: inviter.id,
      action: 'CREATE',
      resourceType: 'User',
      resourceId: user.id,
      metadata: { role: input.role, channel: tempPassword ? 'password' : 'invite' },
    });

    revalidatePath('/provider/team');

    return {
      userId: user.id,
      email,
      // Returned ONCE so the inviter can copy + share. Never stored.
      temporaryPassword: tempPassword,
    };
  },
});

export const updateTeamMember = action({
  schema: z.object({
    id: z.string(),
    firstName: z.string().min(1).max(80).optional(),
    lastName: z.string().min(1).max(80).optional(),
    role: z.nativeEnum(Role).optional(),
  }),
  async handler(input) {
    const editor = await assertPermission('users:manage');
    if (!editor.organizationId) throw new Error('No organization context');

    const target = await db.user.findFirst({
      where: { id: input.id, organizationId: editor.organizationId },
    });
    if (!target) throw new Error('User not found.');

    if (input.role && !isStaffRole(input.role)) {
      throw new Error('Role is not a staff role.');
    }
    if (target.role === Role.OWNER && input.role && input.role !== Role.OWNER) {
      // Don't accidentally demote the last owner.
      const ownerCount = await db.user.count({
        where: { organizationId: editor.organizationId, role: Role.OWNER, isActive: true },
      });
      if (ownerCount <= 1) {
        throw new Error('Cannot demote the last active owner.');
      }
    }
    if (input.role === Role.OWNER && editor.role !== Role.OWNER) {
      throw new Error('Only an existing OWNER can promote another OWNER.');
    }

    const updated = await db.user.update({
      where: { id: input.id },
      data: {
        firstName: input.firstName ?? target.firstName,
        lastName: input.lastName ?? target.lastName,
        role: input.role ?? target.role,
      },
    });

    if (input.role && input.role !== target.role) {
      await db.organizationMembership.updateMany({
        where: { userId: target.id, organizationId: editor.organizationId },
        data: { role: input.role },
      });
    }

    await audit({
      organizationId: editor.organizationId,
      userId: editor.id,
      action: 'UPDATE',
      resourceType: 'User',
      resourceId: updated.id,
      metadata: { role: updated.role },
    });

    revalidatePath('/provider/team');
    return updated;
  },
});

export const setTeamMemberActive = action({
  schema: z.object({ id: z.string(), active: z.coerce.boolean() }),
  async handler(input) {
    const editor = await assertPermission('users:manage');
    if (!editor.organizationId) throw new Error('No organization context');

    const target = await db.user.findFirst({
      where: { id: input.id, organizationId: editor.organizationId },
    });
    if (!target) throw new Error('User not found.');

    if (target.id === editor.id) {
      throw new Error('You cannot deactivate yourself.');
    }
    if (target.role === Role.OWNER && !input.active) {
      const ownerCount = await db.user.count({
        where: {
          organizationId: editor.organizationId,
          role: Role.OWNER,
          isActive: true,
        },
      });
      if (ownerCount <= 1) {
        throw new Error('Cannot deactivate the last active owner.');
      }
    }

    const updated = await db.user.update({
      where: { id: input.id },
      data: { isActive: input.active },
    });

    await audit({
      organizationId: editor.organizationId,
      userId: editor.id,
      action: 'UPDATE',
      resourceType: 'User',
      resourceId: updated.id,
      metadata: { active: input.active },
    });

    revalidatePath('/provider/team');
    return updated;
  },
});

export const resetTeamMemberPassword = action({
  schema: z.object({ id: z.string() }),
  async handler({ id }) {
    const editor = await assertPermission('users:manage');
    if (!editor.organizationId) throw new Error('No organization context');

    const target = await db.user.findFirst({
      where: { id, organizationId: editor.organizationId },
    });
    if (!target) throw new Error('User not found.');

    const supabase = adminSupabase();
    const tempPassword = randomPassword();
    const res = await supabase.auth.admin.updateUserById(target.supabaseUserId, {
      password: tempPassword,
    });
    if (res.error) {
      throw new Error(res.error.message);
    }

    await audit({
      organizationId: editor.organizationId,
      userId: editor.id,
      action: 'UPDATE',
      resourceType: 'User',
      resourceId: target.id,
      metadata: { event: 'password_reset' },
    });

    revalidatePath('/provider/team');
    return { temporaryPassword: tempPassword };
  },
});
