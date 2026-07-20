'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCopilotStore } from '@/store/copilot';
import type { PageContext } from '@/lib/ai/copilot/types';

function pageFromPath(pathname: string): PageContext {
  if (pathname.startsWith('/provider/patients/') && pathname.split('/').length > 3) {
    return 'patient_chart';
  }
  if (pathname.startsWith('/provider/imaging')) return 'imaging';
  if (pathname.startsWith('/provider/appointments')) return 'appointments';
  if (pathname.startsWith('/provider/scheduling')) return 'scheduling';
  if (pathname.startsWith('/provider/care-gaps')) return 'care_gaps';
  if (pathname.startsWith('/provider/messages')) return 'messages';
  if (pathname.startsWith('/provider/inventory')) return 'inventory';
  if (pathname.startsWith('/provider/ambient-scribe')) return 'ambient_scribe';
  if (pathname.startsWith('/provider/timeline-intelligence')) return 'timeline_intelligence';
  if (pathname.startsWith('/provider/dashboard')) return 'dashboard';
  return 'other';
}

function patientIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/provider\/patients\/([^/]+)/);
  return match?.[1] ?? null;
}

/** Sets copilot page context from the current route. Used in provider layout. */
export function CopilotContextFromPath() {
  const pathname = usePathname();
  const setPage = useCopilotStore((s) => s.setPage);
  const setPatientId = useCopilotStore((s) => s.setPatientId);

  useEffect(() => {
    setPage(pageFromPath(pathname));
    setPatientId(patientIdFromPath(pathname));
  }, [pathname, setPage, setPatientId]);

  return null;
}
