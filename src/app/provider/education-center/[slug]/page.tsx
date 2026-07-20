import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { requirePermission } from '@/lib/auth/require';
import {
  EDUCATION_TOPICS,
  getEducationTopic,
  type EducationLocale,
} from '@/lib/education/catalog';

const LOCALE_LABELS: Record<EducationLocale, string> = {
  en: 'English',
  es: 'Español',
  hi: 'हिंदी',
  gu: 'ગુજરાતી',
  ar: 'العربية',
  zh: '中文',
  vi: 'Tiếng Việt',
};

export async function generateStaticParams() {
  return EDUCATION_TOPICS.map((t) => ({ slug: t.slug }));
}

export default async function EducationTopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  await requirePermission('templates:read');
  const { slug } = await params;
  const { lang } = await searchParams;

  const topic = getEducationTopic(slug);
  if (!topic) notFound();

  const available = Object.keys(topic.translations) as EducationLocale[];
  const active: EducationLocale =
    (lang && available.includes(lang as EducationLocale)
      ? (lang as EducationLocale)
      : 'en');
  const content = topic.translations[active] ?? topic.translations.en!;

  return (
    <div className="space-y-6">
      <Link
        href="/provider/education-center"
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' -ml-2'}
      >
        <ArrowLeft className="h-4 w-4" /> Back to library
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{content.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">{topic.category}</Badge>
            <Badge variant="secondary">{topic.audience}</Badge>
            <Badge variant="secondary">{topic.readingLevel}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {available.map((l) => (
            <Link
              key={l}
              href={`/provider/education-center/${slug}?lang=${l}`}
              className={chip(active === l)}
            >
              {LOCALE_LABELS[l]}
            </Link>
          ))}
        </div>
      </div>

      {available.length === 1 && active === 'en' ? (
        <div className="flex items-center gap-2 rounded-md border bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          Only English content is available for this topic. Translations are
          coming and should be reviewed by a clinician before patient hand-off.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{content.summary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What to do at home</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {content.keyPoints.map((k, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-amber-900">
            <AlertTriangle className="h-4 w-4" /> When to call us
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {content.whenToCall.map((k, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <span>
          This handout is patient education only. It does not replace your
          provider&apos;s advice. Last reviewed by the EyeQ AI editorial team.
        </span>
        <span className="inline-flex items-center gap-1">
          <Printer className="h-3 w-3" /> Print-ready
        </span>
      </div>
    </div>
  );
}

function chip(active: boolean) {
  return (
    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
    (active
      ? 'bg-primary text-primary-foreground border-primary'
      : 'bg-card hover:bg-accent')
  );
}
