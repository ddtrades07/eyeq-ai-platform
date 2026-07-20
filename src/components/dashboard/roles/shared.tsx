import type { ReactNode } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/dashboard/metric-card';
import {
  AttentionCard,
  AttentionRow,
  QuickAction,
} from '@/components/dashboard/ops-cards';

export function DashboardShell({
  greeting,
  description,
  actions,
  children,
}: {
  greeting: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={greeting} description={description} actions={actions} />
      {children}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export { MetricCard as StatCard, AttentionCard, AttentionRow, QuickAction };

export function timeOfDayGreeting(firstName: string | null): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${part}, ${firstName ?? 'there'}.`;
}
