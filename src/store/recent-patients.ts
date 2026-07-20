'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RecentPatient {
  id: string;
  name: string;
  visitedAt: number;
}

interface RecentPatientsState {
  patients: RecentPatient[];
  push: (id: string, name: string) => void;
  clear: () => void;
}

const MAX_RECENT = 8;

export const useRecentPatients = create<RecentPatientsState>()(
  persist(
    (set) => ({
      patients: [],
      push: (id, name) =>
        set((s) => {
          const filtered = s.patients.filter((p) => p.id !== id);
          return {
            patients: [{ id, name, visitedAt: Date.now() }, ...filtered].slice(0, MAX_RECENT),
          };
        }),
      clear: () => set({ patients: [] }),
    }),
    { name: 'eyeq-recent-patients' },
  ),
);
