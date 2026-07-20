'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCopilotStore } from '@/store/copilot';

/**
 * Global keyboard shortcuts for EyeQ AI.
 * Mount once in the staff layout, listens for key combos and
 * routes to the right place.
 */
export function useKeyboardShortcuts() {
  const router = useRouter();
  const toggleCopilot = useCopilotStore((s) => s.toggle);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Don't trigger in text inputs.
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleCopilot();
        return;
      }

      // Alt-based navigation shortcuts.
      if (e.altKey) {
        switch (e.key) {
          case 'd': e.preventDefault(); router.push('/provider/dashboard'); break;
          case 'a': e.preventDefault(); router.push('/provider/appointments'); break;
          case 'p': e.preventDefault(); router.push('/provider/patients'); break;
          case 'i': e.preventDefault(); router.push('/provider/imaging'); break;
          case 'm': e.preventDefault(); router.push('/provider/messages'); break;
          case 'c': e.preventDefault(); router.push('/provider/care-gaps'); break;
          case 's': e.preventDefault(); router.push('/provider/ambient-scribe'); break;
        }
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router, toggleCopilot]);
}
