import {
  AlertCircle,
  BookOpenCheck,
  HeartHandshake,
  MessageCircle,
  Repeat2,
  ScanLine,
  Stethoscope,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FlagList } from './flag-card';
import type { PatientIntelligence } from '@/lib/intelligence/types';

/**
 * "Clinical Memory", the persistent memory layer of EyeQ AI.
 * Rendered on the patient chart and on the Timeline Intelligence page.
 */
export function ClinicalMemoryCards({
  memory,
}: {
  memory: PatientIntelligence['clinicalMemory'];
}) {
  const sections: {
    key: keyof PatientIntelligence['clinicalMemory'];
    title: string;
    icon: typeof AlertCircle;
    empty: string;
  }[] = [
    {
      key: 'unresolvedIssues',
      title: 'Unresolved issues',
      icon: AlertCircle,
      empty: 'No unresolved clinical issues tracked.',
    },
    {
      key: 'priorRecommendations',
      title: 'Prior recommendations',
      icon: BookOpenCheck,
      empty: 'No prior signed recommendations on file.',
    },
    {
      key: 'repeatedComplaints',
      title: 'Repeated complaints',
      icon: Repeat2,
      empty: 'No repeated complaint patterns identified.',
    },
    {
      key: 'deferredTesting',
      title: 'Deferred testing',
      icon: Stethoscope,
      empty: 'No deferred testing noted in plan history.',
    },
    {
      key: 'imagingReviewNotes',
      title: 'Imaging review notes',
      icon: ScanLine,
      empty: 'No imaging-specific memory notes.',
    },
    {
      key: 'lifestyleConsiderations',
      title: 'Lifestyle considerations',
      icon: HeartHandshake,
      empty: 'No lifestyle factors tracked yet.',
    },
    {
      key: 'communicationPreferences',
      title: 'Communication preferences',
      icon: MessageCircle,
      empty: 'Not enough message history to infer a preference.',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sections.map((s) => {
        const Icon = s.icon;
        return (
          <Card key={s.key}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-primary" /> {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FlagList flags={memory[s.key]} emptyMessage={s.empty} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
