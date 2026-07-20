import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { SafetyDisclaimer } from '@/components/safety/safety-disclaimer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EyeHealthArticleCard } from '@/components/eye-health/article-card';
import { requirePortalPatient } from '@/lib/auth/portal';
import { EYE_HEALTH_CATEGORIES, type EyeHealthCategoryId } from '@/lib/eye-health/catalog';
import {
  listPatientRecommendations,
  listSavedSlugs,
  listVisibleArticleSummaries,
} from '@/lib/eye-health/service';

export const metadata = {
  title: 'Eye Health Library',
  description: 'Learn about eye conditions, prevention, and care. Educational information only.',
};

export default async function PatientEyeHealthLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const session = await requirePortalPatient();
  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const category = (params.category as EyeHealthCategoryId | 'all' | undefined) ?? 'all';

  const [articles, recommendations, saved] = await Promise.all([
    listVisibleArticleSummaries({
      organizationId: session.organizationId!,
      query: q,
      category,
    }),
    listPatientRecommendations(session.organizationId!, session.patientId),
    listSavedSlugs(session.patientId),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Eye Health Library"
        description="Learn about eye conditions, prevention, and care. Educational information only. Your provider will confirm what applies to you."
      />
      <SafetyDisclaimer variant="patient" />

      {recommendations.length ? (
        <Card className="border-sky-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recommended by your provider</CardTitle>
            <p className="text-xs text-muted-foreground">
              Shared because it may relate to your visit. This is not a diagnosis.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {recommendations.slice(0, 6).map((r) => (
              <Link
                key={r.id}
                href={`/patient/eye-health-library/${r.slug}`}
                className="rounded-lg border px-3 py-2 text-sm hover:bg-muted/40"
              >
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{r.summary}</div>
                <Badge variant="outline" className="mt-2">
                  {r.context === 'DISCUSSION_TOPIC'
                    ? 'Possible topic for provider discussion'
                    : r.context === 'RELATED_TO_VISIT'
                      ? 'Related to your recent visit'
                      : 'Recommended by your provider'}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <form className="flex flex-wrap gap-2" method="get">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search conditions, symptoms, prevention…"
          className="max-w-md"
        />
        <input type="hidden" name="category" value={category} />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <CategoryChip href="/patient/eye-health-library" active={category === 'all'} label="All" />
        {EYE_HEALTH_CATEGORIES.map((c) => (
          <CategoryChip
            key={c.id}
            href={`/patient/eye-health-library?category=${c.id}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            active={category === c.id}
            label={c.label}
          />
        ))}
      </div>

      {articles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No articles matched your search.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <EyeHealthArticleCard
              key={a.slug}
              article={a}
              hrefBase="/patient/eye-health-library"
              saved={saved.has(a.slug)}
            />
          ))}
        </div>
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <BookOpen className="h-3.5 w-3.5" />
        Demo educational content is labeled until your practice marks articles as practice-approved.
      </p>
    </div>
  );
}

function CategoryChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground'
          : 'rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted'
      }
    >
      {label}
    </Link>
  );
}
