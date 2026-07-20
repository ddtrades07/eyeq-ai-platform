import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EyeHealthArticleCard } from '@/components/eye-health/article-card';
import { requirePermission } from '@/lib/auth/require';
import { EYE_HEALTH_CATEGORIES, type EyeHealthCategoryId } from '@/lib/eye-health/catalog';
import { listVisibleArticleSummaries } from '@/lib/eye-health/service';

export const metadata = {
  title: 'Eye Health Library',
  description: 'Patient education library for optometry practices.',
};

export default async function ProviderEyeHealthLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const user = await requirePermission('templates:read');
  if (!user.organizationId) return null;
  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const category = (params.category as EyeHealthCategoryId | 'all' | undefined) ?? 'all';

  const articles = await listVisibleArticleSummaries({
    organizationId: user.organizationId,
    query: q,
    category,
    includeHiddenForStaff: true,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eye Health Library"
        description="Patient-friendly education for conditions, prevention, and care. Educational only — not a diagnosis tool. Preview, approve, and recommend articles to patients."
      />

      <form className="flex flex-wrap gap-2" method="get">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search library…"
          className="max-w-md"
        />
        <input type="hidden" name="category" value={category} />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <CategoryChip href="/provider/eye-health-library" active={category === 'all'} label="All" />
        {EYE_HEALTH_CATEGORIES.map((c) => (
          <CategoryChip
            key={c.id}
            href={`/provider/eye-health-library?category=${c.id}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            active={category === c.id}
            label={c.label}
          />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <EyeHealthArticleCard
            key={a.slug}
            article={a}
            hrefBase="/provider/eye-health-library"
          />
        ))}
      </div>
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
