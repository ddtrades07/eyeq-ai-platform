'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Role } from '@prisma/client';

const CopilotPanel = dynamic(
  () => import('@/components/copilot/copilot-panel').then((m) => m.CopilotPanel),
  { ssr: false },
);
const CommandBar = dynamic(
  () => import('@/components/command/command-bar').then((m) => m.CommandBar),
  { ssr: false },
);
const KeyboardShortcuts = dynamic(
  () => import('@/components/layout/keyboard-shortcuts').then((m) => m.KeyboardShortcuts),
  { ssr: false },
);
const DebugPanel = dynamic(
  () => import('@/components/debug/debug-panel').then((m) => m.DebugPanel),
  { ssr: false },
);

/**
 * Mount heavy interactive chrome after first paint / on idle.
 * Command bar still listens via KeyboardShortcuts once loaded.
 */
export function LazyClientShell({ role }: { role: Role }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ric = window.requestIdleCallback
      ? window.requestIdleCallback(() => setReady(true), { timeout: 1200 })
      : null;
    const t = ric == null ? window.setTimeout(() => setReady(true), 200) : null;
    return () => {
      if (ric != null && window.cancelIdleCallback) window.cancelIdleCallback(ric);
      if (t != null) window.clearTimeout(t);
    };
  }, []);

  if (!ready) return null;

  return (
    <>
      <CopilotPanel />
      <CommandBar role={role} />
      <KeyboardShortcuts />
      {process.env.NODE_ENV !== 'production' ? <DebugPanel /> : null}
    </>
  );
}
