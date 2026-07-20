'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SelectedPatientState {
  patientId: string | null;
  patientName: string | null;
  setSelectedPatient: (id: string, name: string) => void;
  clearSelectedPatient: () => void;
}

/** Global selected patient for search, copilot, and cross-page workflows. */
export const useSelectedPatient = create<SelectedPatientState>()(
  persist(
    (set) => ({
      patientId: null,
      patientName: null,
      setSelectedPatient: (patientId, patientName) => set({ patientId, patientName }),
      clearSelectedPatient: () => set({ patientId: null, patientName: null }),
    }),
    { name: 'eyeq-selected-patient' },
  ),
);
