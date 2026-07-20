'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const COOKIE = 'eyeq_recording_mode';

/**
 * Syncs ?recording=true|false into a cookie so server layouts can hide
 * noisy demo/dev chrome while keeping safety + demo labels.
 */
export function RecordingModeSync() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const raw = searchParams.get('recording');
    if (raw === null) return;

    const on = raw === '1' || raw === 'true';
    document.cookie = `${COOKIE}=${on ? '1' : '0'}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

    const next = new URLSearchParams(searchParams.toString());
    next.delete('recording');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [searchParams, router, pathname]);

  return null;
}
