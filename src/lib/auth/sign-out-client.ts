'use client';

/**
 * Ends the session via the server (clears httpOnly Supabase cookies), then
 * hard-navigates so middleware sees an unauthenticated user.
 */
export async function signOutAndRedirect(redirectTo: string = '/login'): Promise<void> {
  try {
    await fetch('/api/auth/sign-out', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    // Network error, still navigate; user may need to clear cookies manually
  }
  window.location.assign(redirectTo);
}
