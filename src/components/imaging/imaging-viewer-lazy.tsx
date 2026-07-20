'use client';

import dynamic from 'next/dynamic';

export const ImagingViewerLazy = dynamic(
  () => import('@/components/imaging/imaging-viewer').then((m) => m.ImagingViewer),
  {
    loading: () => (
      <div className="flex h-72 items-center justify-center rounded-lg bg-muted/40 text-sm text-muted-foreground animate-pulse">
        Loading viewer…
      </div>
    ),
    ssr: false,
  },
);
