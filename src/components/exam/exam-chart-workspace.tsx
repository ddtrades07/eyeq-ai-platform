'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  EXAM_CATEGORIES,
  sectionsForCategory,
  type ExamSectionData,
} from '@/lib/exam/sections';
import {
  applyNormalFindings,
  signExamChart,
  updateExamChartSections,
} from '@/server/actions/exam-chart';

export function ExamChartWorkspace({
  chartId,
  encounterId,
  status,
  initialSections,
  signed,
}: {
  chartId: string;
  encounterId: string;
  status: string;
  initialSections: ExamSectionData;
  signed: boolean;
}) {
  const router = useRouter();
  const [sections, setSections] = React.useState<ExamSectionData>(initialSections);
  const [pending, startTransition] = React.useTransition();

  function updateSection(key: string, value: string) {
    setSections((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const r = await updateExamChartSections({ chartId, sections });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Exam chart saved');
      router.refresh();
    });
  }

  function applyNormal(key: string) {
    startTransition(async () => {
      const r = await applyNormalFindings({ chartId, sectionKey: key });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Normal findings applied');
      router.refresh();
    });
  }

  function sign() {
    startTransition(async () => {
      const r = await signExamChart({ chartId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Exam chart signed');
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant={signed ? 'success' : 'outline'}>{status.replace(/_/g, ' ')}</Badge>
        <div className="flex gap-2">
          {!signed ? (
            <>
              <Button size="sm" variant="outline" onClick={save} disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save draft
              </Button>
              <Button size="sm" onClick={sign} disabled={pending}>
                Sign chart
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="refraction">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          {EXAM_CATEGORIES.filter((c) => c.id !== 'admin').map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {EXAM_CATEGORIES.filter((c) => c.id !== 'admin').map((cat) => (
          <TabsContent key={cat.id} value={cat.id} className="space-y-4 pt-4">
            {sectionsForCategory(cat.id).map((def) => {
              if (def.fieldType === 'readonly') return null;
              const value = String(sections[def.key] ?? '');
              return (
                <div key={def.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm font-medium">{def.label}</Label>
                    {def.normalMacro && !signed ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => applyNormal(def.key)}
                        disabled={pending}
                      >
                        <Wand2 className="h-3 w-3" /> Normal
                      </Button>
                    ) : null}
                  </div>
                  {def.fieldType === 'textarea' ? (
                    <Textarea
                      rows={3}
                      value={value}
                      onChange={(e) => updateSection(def.key, e.target.value)}
                      disabled={signed}
                      placeholder={def.normalMacro}
                    />
                  ) : (
                    <Input
                      value={value}
                      onChange={(e) => updateSection(def.key, e.target.value)}
                      disabled={signed}
                      placeholder={def.normalMacro}
                    />
                  )}
                </div>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
