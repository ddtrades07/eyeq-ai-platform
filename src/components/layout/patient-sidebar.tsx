'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PATIENT_NAV } from '@/lib/navigation/patient-nav';

export function PatientSidebar({ patientName }: { patientName: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card/50 lg:flex lg:flex-col">
      <div className="flex items-center gap-2 border-b px-5 py-4">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
          <Eye className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold">EyeQ</div>
          <div className="text-xs text-muted-foreground">Patient portal</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {PATIENT_NAV.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-5 py-4 text-xs">
        <div className="font-medium text-foreground">{patientName}</div>
        <div className="text-muted-foreground">Patient</div>
      </div>
    </aside>
  );
}
