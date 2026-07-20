'use client';

import { useEffect } from 'react';
import { useCopilotStore } from '@/store/copilot';
import { useSelectedPatient } from '@/store/selected-patient';
import type { PageContext } from '@/lib/ai/copilot/types';

/**
 * Invisible component that sets the copilot's page + patient context.
 * Drop it into any page component:
 *
 *   <CopilotContextSetter page="patient_chart" patientId={patient.id} />
 */
export function CopilotContextSetter({
  page,
  patientId,
  patientName,
}: {
  page: PageContext;
  patientId?: string | null;
  patientName?: string | null;
}) {
  const setPage = useCopilotStore((s) => s.setPage);
  const setPatientId = useCopilotStore((s) => s.setPatientId);
  const setSelectedPatient = useSelectedPatient((s) => s.setSelectedPatient);

  useEffect(() => {
    setPage(page);
    setPatientId(patientId ?? null);
    if (patientId && patientName) {
      setSelectedPatient(patientId, patientName);
    }
  }, [page, patientId, patientName, setPage, setPatientId, setSelectedPatient]);

  return null;
}
