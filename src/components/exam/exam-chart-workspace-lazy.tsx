'use client';

import dynamic from 'next/dynamic';

export const ExamChartWorkspaceLazy = dynamic(
  () =>
    import('@/components/exam/exam-chart-workspace').then((m) => m.ExamChartWorkspace),
  {
    loading: () => <div className="h-96 animate-pulse rounded-xl border bg-muted/40" />,
    ssr: false,
  },
);
