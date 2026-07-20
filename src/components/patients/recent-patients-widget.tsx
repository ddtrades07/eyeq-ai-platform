'use client';

import Link from 'next/link';
import { Clock, Users } from 'lucide-react';
import { useRecentPatients } from '@/store/recent-patients';

export function RecentPatientsWidget() {
  const patients = useRecentPatients((s) => s.patients);

  if (patients.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Clock className="h-3 w-3" />
        Recent patients
      </div>
      <div className="flex flex-wrap gap-1.5">
        {patients.slice(0, 5).map((p) => (
          <Link
            key={p.id}
            href={`/provider/patients/${p.id}`}
            className="inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            <Users className="h-3 w-3 text-muted-foreground" />
            {p.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
