import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_ROUTES = new Set<string>([
  '/',
  '/contact',
  '/login',
  '/demo',
  '/signup',
  '/signup-patient',
  '/forgot-password',
  '/reset-password',
  '/access-denied',
]);

const PUBLIC_API_ROUTES = new Set([
  '/api/health',
  '/api/auth/sign-out',
  '/api/webhooks/stripe',
]);

const PUBLIC_PREFIXES = ['/auth/callback', '/_next', '/favicon', '/assets'];

/**
 * Legacy path support. The platform moved to /provider/* and /patient/*
 * so bookmarks and old links keep working.
 */
const LEGACY_STAFF_ROUTES = new Set([
  'dashboard', 'appointments', 'patients', 'pre-charting', 'ambient-scribe',
  'timeline-intelligence', 'imaging', 'imaging-timeline', 'disease-templates',
  'care-gaps', 'copilots', 'messages', 'scheduling', 'reminders',
  'education-center', 'eye-health-library', 'inventory', 'financial-reports', 'admin-insights',
  'practice-setup', 'team', 'workflow-builder', 'ehr-integrations',
  'installation-readiness', 'settings', 'billing', 'audit-logs', 'tasks',
  'reputation',
]);

function legacyRedirectTarget(pathname: string): string | null {
  if (pathname === '/portal') return '/patient/home';
  if (pathname.startsWith('/portal/')) {
    const rest = pathname.slice('/portal'.length);
    return rest === '/learn' ? '/patient/eye-health-library' : `/patient${rest}`;
  }
  const firstSegment = pathname.split('/')[1];
  if (firstSegment && LEGACY_STAFF_ROUTES.has(firstSegment)) {
    return `/provider${pathname}`;
  }
  return null;
}

function isPublic(pathname: string) {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  if (PUBLIC_API_ROUTES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const legacy = legacyRedirectTarget(pathname);
  if (legacy) {
    const url = request.nextUrl.clone();
    url.pathname = legacy;
    return NextResponse.redirect(url, 308);
  }

  if (isPublic(pathname)) {
    // Already logged in? Send to the role-aware launcher.
    if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/signup-patient')) {
      const url = request.nextUrl.clone();
      url.pathname = '/launch';
      url.search = '';
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match every path except static files and image assets so that
     * session refresh runs on the widest reasonable surface.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
