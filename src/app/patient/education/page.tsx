import { BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { SafetyDisclaimer } from '@/components/safety/safety-disclaimer';

export const metadata = { title: 'Eye health library' };

const TOPICS = [
  {
    title: 'Caring for your eyes between visits',
    body:
      'Simple habits like good contact lens hygiene, screen breaks, and staying hydrated help keep your eyes comfortable day to day.',
  },
  {
    title: 'When to call the office',
    body:
      'Sudden vision loss, severe eye pain, new flashes or floaters, or something stuck in your eye needs prompt care. Call the office or 911.',
  },
  {
    title: 'Understanding your prescription',
    body:
      'Your prescription shows the lens power for each eye. Your care team can walk you through what the numbers mean for glasses or contacts.',
  },
];

export default function PortalLearn() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Eye health library"
        description="Helpful articles from your care team."
      />
      <SafetyDisclaimer variant="patient" />
      <div className="grid gap-4 md:grid-cols-3">
        {TOPICS.map((t) => (
          <Card key={t.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-primary" /> {t.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{t.body}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
