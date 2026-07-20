'use client';

import { useEffect } from 'react';
import { useRecentPatients } from '@/store/recent-patients';
import { useSelectedPatient } from '@/store/selected-patient';
import { useCopilotStore } from '@/store/copilot';

export function TrackRecentPatient({ id, name }: { id: string; name: string }) {
  const push = useRecentPatients((s) => s.push);
  const setSelectedPatient = useSelectedPatient((s) => s.setSelectedPatient);
  const setPatientId = useCopilotStore((s) => s.setPatientId);

  useEffect(() => {
    push(id, name);
    setSelectedPatient(id, name);
    setPatientId(id);
  }, [id, name, push, setSelectedPatient, setPatientId]);

  return null;
}
