import { redirect } from 'next/navigation';
import type { Role } from '@prisma/client';
import { hasPermission, isStaffRole, type Permission } from '@/lib/auth/rbac';
import { getCurrentUser, type SessionUser } from '@/lib/auth/session';

export type { SessionUser };

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireStaffUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isStaffRole(user.role)) redirect('/patient/home');
  if (!user.organizationId) redirect('/onboarding');
  return user;
}

export async function requirePatientUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'PATIENT') redirect('/provider/dashboard');
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect('/access-denied');
  return user;
}

/** Page-level guard. Redirects to a clean access denied page. */
export async function requirePermission(
  permission: Permission,
): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) {
    redirect('/access-denied');
  }
  return user;
}

/**
 * Use inside server actions where redirects aren't appropriate.
 * Throws an `AuthError` instead, which the server-action wrapper
 * converts into a structured failure response.
 */
export async function assertPermission(
  permission: Permission,
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError('Not authenticated', 401);
  if (!hasPermission(user.role, permission)) {
    throw new AuthError(`Missing permission: ${permission}`, 403);
  }
  return user;
}

/**
 * Asserts the supplied row belongs to the caller's organization.
 * The cornerstone of multi-tenant isolation, every server action
 * that reads or mutates an organization-scoped row must call this.
 */
export function assertSameOrg(
  user: Pick<SessionUser, 'organizationId'>,
  row: { organizationId: string },
): void {
  if (!user.organizationId || user.organizationId !== row.organizationId) {
    throw new AuthError('Cross-tenant access denied', 403);
  }
}

export type ApiSessionUser = SessionUser & { organizationId: string };

/** API route guard. Returns null when unauthenticated or missing permission. */
export async function requireApiPermission(
  permission: Permission,
): Promise<ApiSessionUser | null> {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;
  if (!hasPermission(user.role, permission)) return null;
  return user as ApiSessionUser;
}
