'use client';

import { toast } from 'sonner';
import { DEMO_EXTERNAL_ACTION_MESSAGE, isDemoActionResult } from '@/lib/demo/safety';

/** Success toast plus a demo-environment notice when the server marks an external action as simulated. */
export function toastWithDemoNotice(
  successMessage: string,
  data?: unknown,
): void {
  toast.success(successMessage);
  if (isDemoActionResult(data)) {
    toast.info('Demo environment', {
      description: data.demoMessage ?? DEMO_EXTERNAL_ACTION_MESSAGE,
      duration: 7000,
    });
  }
}
