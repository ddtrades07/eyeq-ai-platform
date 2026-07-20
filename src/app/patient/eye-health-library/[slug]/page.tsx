import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { EyeHealthArticleBody } from '@/components/eye-health/article-body';
import { PatientArticleActions } from '@/components/eye-health/patient-article-actions';
import { requirePortalPatient } from '@/lib/auth/portal';
import { getCategoryLabel } from '@/lib/eye-health/catalog';
import { getResolvedArticle, listSavedSlugs } from '@/lib/eye-health/service';
import { cn } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `Eye Health · ${slug}` };
}

export default async function PatientEyeHealthArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requirePortalPatient();
  const { slug } = await params;
  const article = await getResolvedArticle(session.organizationId!, slug);
  if (!article) notFound();
  const saved = await listSavedSlugs(session.patientId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/patient/eye-health-library"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-2')}
      >
        <ArrowLeft className="h-4 w-4" /> Back to library
      </Link>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">Educational only</Badge>
          {article.isDemoContent ? <Badge variant="secondary">Demo content</Badge> : null}
          <Badge variant="outline">{getCategoryLabel(article.category)}</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{article.title}</h1>
      </div>
      <PatientArticleActions slug={article.slug} initiallySaved={saved.has(article.slug)} />
      <EyeHealthArticleBody article={article} />
    </div>
  );
}
