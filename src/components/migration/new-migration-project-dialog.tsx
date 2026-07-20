'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createMigrationProject } from '@/server/actions/migration';

const SOURCES = [
  { id: 'revolution_ehr', label: 'RevolutionEHR' },
  { id: 'eyefinity_officemate', label: 'Eyefinity OfficeMate' },
  { id: 'eyefinity_examwriter', label: 'Eyefinity ExamWRITER' },
  { id: 'crystal_pm', label: 'Crystal Practice Management' },
  { id: 'compulink', label: 'Compulink Advantage' },
  { id: 'my_vision_express', label: 'My Vision Express' },
  { id: 'generic_csv', label: 'Generic CSV export' },
  { id: 'generic_ehr_export', label: 'Generic EHR export' },
] as const;

export function NewMigrationProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [name, setName] = React.useState('');
  const [sourceSystem, setSourceSystem] = React.useState<string>('generic_csv');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Enter a project name');
      return;
    }
    startTransition(async () => {
      const r = await createMigrationProject({
        name: name.trim(),
        sourceSystem: sourceSystem as (typeof SOURCES)[number]['id'],
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Migration project created');
      setOpen(false);
      router.push(`/provider/migration/${r.data.id}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> New migration project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Data Migration Center</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Project name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Vision go-live" />
          </div>
          <div className="space-y-1.5">
            <Label>Source system</Label>
            <Select value={sourceSystem} onValueChange={setSourceSystem}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
