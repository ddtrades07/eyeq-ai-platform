'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { AppointmentType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveVisitWorkflow } from '@/server/actions/workflow';
import type { VisitWorkflowTemplateData } from '@/lib/workflow/defaults';

function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function arrayToLines(items: string[]): string {
  return items.join('\n');
}

export function WorkflowEditor({ template }: { template: VisitWorkflowTemplateData }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [name, setName] = React.useState(template.name);
  const [duration, setDuration] = React.useState(String(template.durationMinutes));
  const [pretest, setPretest] = React.useState(arrayToLines(template.pretest));
  const [imaging, setImaging] = React.useState(arrayToLines(template.imaging));
  const [pathway, setPathway] = React.useState(arrayToLines(template.carePathway));

  function save() {
    startTransition(async () => {
      const r = await saveVisitWorkflow({
        appointmentType: template.type as AppointmentType,
        name,
        durationMinutes: Number(duration) || template.durationMinutes,
        pretestSteps: linesToArray(pretest),
        imagingSteps: linesToArray(imaging),
        carePathwaySteps: linesToArray(pathway),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Workflow saved for your practice');
      router.refresh();
    });
  }

  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Display name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Default duration (minutes)</Label>
          <Input
            type="number"
            min={5}
            max={480}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Pretest checklist (one item per line)</Label>
        <Textarea rows={4} value={pretest} onChange={(e) => setPretest(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Imaging (one item per line)</Label>
        <Textarea rows={2} value={imaging} onChange={(e) => setImaging(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Care pathway (one step per line)</Label>
        <Textarea rows={3} value={pathway} onChange={(e) => setPathway(e.target.value)} />
      </div>
      <Button size="sm" onClick={save} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save workflow
      </Button>
    </div>
  );
}
