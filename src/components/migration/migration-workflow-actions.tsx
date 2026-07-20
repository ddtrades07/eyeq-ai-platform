'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  validateMigrationProject,
  runTrialMigrationImport,
  reconcileMigrationProject,
  approveMigrationProject,
} from '@/server/actions/migration';

export function MigrationWorkflowActions({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function run(action: 'validate' | 'trial' | 'reconcile' | 'approve') {
    startTransition(async () => {
      let r;
      if (action === 'validate') r = await validateMigrationProject({ projectId });
      else if (action === 'trial') r = await runTrialMigrationImport({ projectId });
      else if (action === 'reconcile') r = await reconcileMigrationProject({ projectId });
      else r = await approveMigrationProject({ projectId });

      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (action === 'reconcile' && r.data && 'patients' in r.data) {
        toast.message(
          `Reconciliation: ${r.data.patients.stagedImported} staged vs ${r.data.patients.liveWithExternalId} live`,
        );
      } else {
        toast.success('Step completed');
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run('validate')}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Validate
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run('trial')}>
        Trial import
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run('reconcile')}>
        Reconcile
      </Button>
      <Button size="sm" disabled={pending} onClick={() => run('approve')}>
        Practice sign-off
      </Button>
    </div>
  );
}
