'use client';

import * as React from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { exportPracticeData } from '@/server/actions/data-export';

export function DataExportPanel() {
  const [pending, startTransition] = React.useTransition();
  const [scope, setScope] = React.useState<'patients' | 'appointments' | 'claims' | 'invoices'>(
    'patients',
  );

  function download() {
    startTransition(async () => {
      const r = await exportPracticeData({ scope });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const blob = new Blob([r.data.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = r.data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${r.data.recordCount} record(s)`);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-48">
        <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="patients">Patients</SelectItem>
            <SelectItem value="appointments">Appointments</SelectItem>
            <SelectItem value="claims">Claims</SelectItem>
            <SelectItem value="invoices">Invoices</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={download} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Download CSV
      </Button>
    </div>
  );
}
