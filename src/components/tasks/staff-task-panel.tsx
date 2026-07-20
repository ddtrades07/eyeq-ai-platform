'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createStaffTask, completeStaffTask } from '@/server/actions/tasks';
import type { StaffTaskPriority, StaffTaskStatus } from '@prisma/client';
import { Badge } from '@/components/ui/badge';

export type StaffTaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: StaffTaskStatus;
  priority: StaffTaskPriority;
  dueAt: Date | null;
  patientId: string | null;
  patientName?: string;
};

export function StaffTaskPanel({ tasks }: { tasks: StaffTaskRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [title, setTitle] = React.useState('');
  const [priority, setPriority] = React.useState<StaffTaskPriority>('NORMAL');

  function createTask() {
    if (!title.trim()) return;
    startTransition(async () => {
      const r = await createStaffTask({ title: title.trim(), priority });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Task created');
      setTitle('');
      router.refresh();
    });
  }

  function complete(taskId: string) {
    startTransition(async () => {
      const r = await completeStaffTask({ taskId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Task completed');
      router.refresh();
    });
  }

  const open = tasks.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="New task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="max-w-xs"
        />
        <Select value={priority} onValueChange={(v) => setPriority(v as StaffTaskPriority)}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="NORMAL">Normal</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={createTask} disabled={pending || !title.trim()}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add task
        </Button>
      </div>

      {open.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open staff tasks.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {open.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-2 p-3 text-sm">
              <div>
                <p className="font-medium">{task.title}</p>
                {task.patientName ? (
                  <p className="text-xs text-muted-foreground">Patient: {task.patientName}</p>
                ) : null}
                <Badge variant="outline" className="mt-1 text-xs">
                  {task.priority.toLowerCase()}
                </Badge>
              </div>
              <Button size="sm" variant="outline" onClick={() => complete(task.id)} disabled={pending}>
                Complete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PatientImportForm() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [csv, setCsv] = React.useState('');
  const [preview, setPreview] = React.useState<string | null>(null);
  const [dryRunDone, setDryRunDone] = React.useState(false);
  const [errorCsv, setErrorCsv] = React.useState<string | null>(null);

  function runPreview() {
    startTransition(async () => {
      const { previewPatientImport } = await import('@/server/actions/import');
      const r = await previewPatientImport({ csvContent: csv });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setPreview(
        `${r.data.label}: ${r.data.validCount} valid / ${r.data.duplicateCount} duplicate / ${r.data.invalidCount} invalid of ${r.data.totalRows} rows`,
      );
    });
  }

  function runImport(dryRun: boolean) {
    startTransition(async () => {
      const { importPatientsFromCsv } = await import('@/server/actions/import');
      const r = await importPatientsFromCsv({
        csvContent: csv,
        dryRun,
        confirmedAfterDryRun: !dryRun && dryRunDone,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (r.data.errorCsv) setErrorCsv(r.data.errorCsv);
      toast.success(
        dryRun
          ? `Dry run: ${r.data.created} would be created, ${r.data.duplicates} duplicates, ${r.data.skipped} skipped`
          : `Imported ${r.data.created} patients (${r.data.duplicates} duplicates skipped)`,
      );
      if (dryRun) setDryRunDone(true);
      if (!dryRun) {
        setDryRunDone(false);
        router.refresh();
      }
    });
  }

  function downloadErrors() {
    if (!errorCsv) return;
    const blob = new Blob([errorCsv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eyeq-csv-import-errors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        CSV patient migration assistant — not full EHR conversion. Controlled pilot requires a dry run
        before live import.
      </p>
      <Textarea
        placeholder="Paste CSV with headers: first_name, last_name, date_of_birth, email, phone, mrn"
        value={csv}
        onChange={(e) => {
          setCsv(e.target.value);
          setDryRunDone(false);
          setErrorCsv(null);
        }}
        rows={8}
        className="font-mono text-xs"
      />
      {preview ? <p className="text-sm text-muted-foreground">{preview}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={runPreview} disabled={pending || csv.length < 10}>
          Preview / validate
        </Button>
        <Button size="sm" variant="outline" onClick={() => runImport(true)} disabled={pending || csv.length < 10}>
          Dry run
        </Button>
        <Button
          size="sm"
          onClick={() => runImport(false)}
          disabled={pending || csv.length < 10}
        >
          Import{dryRunDone ? ' (confirmed)' : ''}
        </Button>
        {errorCsv ? (
          <Button size="sm" variant="outline" onClick={downloadErrors}>
            Download error CSV
          </Button>
        ) : null}
      </div>
    </div>
  );
}
