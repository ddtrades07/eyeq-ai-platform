'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCopilotStore } from '@/store/copilot';

/** Button that opens the copilot panel from any page. */
export function AskEyeQLauncher() {
  const setOpen = useCopilotStore((s) => s.setOpen);
  return (
    <Button
      onClick={() => setOpen(true)}
      className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
    >
      <Sparkles className="h-4 w-4" />
      Open Ask EyeQ
    </Button>
  );
}
