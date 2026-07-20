import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { isStaffRole } from '@/lib/auth/rbac';

/** Role-aware entry point. Sends each user to the right portal. */
export default async function LaunchPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (isStaffRole(user.role)) redirect('/provider/dashboard');
  redirect('/patient/home');
}
