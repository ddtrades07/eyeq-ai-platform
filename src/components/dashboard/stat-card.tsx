import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/metric-card';

/** @deprecated Prefer MetricCard — kept for existing imports. */
export function StatCard(props: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  accent?: 'default' | 'warning' | 'destructive' | 'success';
}) {
  return <MetricCard {...props} />;
}

export { MetricCard };
export { Link };
