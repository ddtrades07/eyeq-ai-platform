import Link from 'next/link';
import { GraduationCap, Languages } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { requirePermission } from '@/lib/auth/require';
import { EDUCATION_TOPICS } from '@/lib/education/catalog';

export const metadata = { title: 'Patient education library' };

export default async function EducationCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  await requirePermission('templates:read');
  const params = await searchParams;

  const categories = Array.from(new Set(EDUCATION_TOPICS.map((t) => t.category))).sort();
  const q = params.q?.toLowerCase().trim() ?? '';
  const cat = params.category ?? null;

  const filtered = EDUCATION_TOPICS.filter((t) => {
    if (cat && t.category !== cat) return false;
    if (!q) return true;
    const en = t.translations.en;
    return (
      t.slug.includes(q) ||
      (en?.title.toLowerCase().includes(q) ?? false) ||
      (en?.summary.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Patient education library</h2>
        <p className="text-sm text-muted-foreground">
          Plain-language patient education your team can hand out at checkout
          or send through the portal. Clinical translations should be reviewed
          before use with patients.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <form className="flex-1 min-w-[240px]">
            <Input
              name="q"
              placeholder="Search topics (e.g. dry eye, LASIK, glaucoma drops)"
              defaultValue={params.q ?? ''}
            />
          </form>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href="/provider/education-center"
              className={chip(cat === null)}
            >
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c}
                href={`/provider/education-center?category=${encodeURIComponent(c)}`}
                className={chip(cat === c)}
              >
                {c}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No topics match your search.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => {
            const en = t.translations.en!;
            const locales = Object.keys(t.translations) as Array<keyof typeof t.translations>;
            return (
              <Link key={t.slug} href={`/provider/education-center/${t.slug}`} className="block">
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{en.title}</CardTitle>
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardDescription className="line-clamp-2">{en.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">{t.category}</Badge>
                      <Badge variant="secondary">{t.audience}</Badge>
                      <Badge variant="secondary">{t.readingLevel}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Languages className="h-3 w-3" />
                      {locales.length} language{locales.length === 1 ? '' : 's'}:{' '}
                      {locales.join(', ').toUpperCase()}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
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
