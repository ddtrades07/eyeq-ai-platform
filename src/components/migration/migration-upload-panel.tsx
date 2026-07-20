'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { uploadMigrationCsv } from '@/server/actions/migration';

export function MigrationUploadPanel({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [domain, setDomain] = React.useState('patients');

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const csvContent = String(reader.result ?? '');
      startTransition(async () => {
        const r = await uploadMigrationCsv({
          projectId,
          domain,
          fileName: file.name,
          csvContent,
          isTrial: true,
        });
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        toast.success(`Staged ${r.data.rowCount} row(s)`);
        router.refresh();
      });
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-medium">Upload source file</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Data domain</Label>
          <Select value={domain} onValueChange={setDomain}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="patients">Patients</SelectItem>
              <SelectItem value="appointments">Appointments</SelectItem>
              <SelectItem value="claims">Claims</SelectItem>
              <SelectItem value="inventory">Inventory</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>CSV file</Label>
          <Button variant="outline" className="w-full" disabled={pending} asChild>
            <label>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Choose file
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
            </label>
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Files are staged separately from production tables. SQL uploads are not executed directly.
      </p>
    </div>
  );
}
