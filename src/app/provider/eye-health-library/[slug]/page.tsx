import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { EyeHealthArticleBody } from '@/components/eye-health/article-body';
import {
  ApproveArticleControls,
  RecommendArticleForm,
} from '@/components/eye-health/provider-article-actions';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { getCategoryLabel } from '@/lib/eye-health/catalog';
import { getResolvedArticle } from '@/lib/eye-health/service';
import { formatFullName } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default async function ProviderEyeHealthArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requirePermission('templates:read');
  if (!user.organizationId) return null;
  const { slug } = await params;
  const article = await getResolvedArticle(user.organizationId, slug, { allowHidden: true });
  if (!article) notFound();

  const canManage = hasPermission(user.role, 'templates:manage');
  const canSend = hasPermission(user.role, 'messages:send');
  const patients = canSend
    ? await db.patient.findMany({
        where: { organizationId: user.organizationId, archivedAt: null },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 80,
        select: { id: true, firstName: true, lastName: true },
      })
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/provider/eye-health-library"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-2')}
      >
        <ArrowLeft className="h-4 w-4" /> Back to library
      </Link>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">Educational only</Badge>
          {article.isDemoContent ? <Badge variant="secondary">Demo content</Badge> : null}
          <Badge variant="outline">{getCategoryLabel(article.category)}</Badge>
          <Badge variant="secondary" className="capitalize">
            {article.orgReviewStatus.replace(/_/g, ' ')}
          </Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{article.title}</h1>
        <p className="text-sm text-muted-foreground">
          Preview the patient-facing article. Recommend or message without claiming a diagnosis.
        </p>
      </div>

      <ApproveArticleControls slug={article.slug} canManage={canManage} />

      {canSend ? (
        <RecommendArticleForm
          slug={article.slug}
          patients={patients.map((p) => ({
            id: p.id,
            label: formatFullName(p.firstName, p.lastName),
          }))}
        />
      ) : null}

      <EyeHealthArticleBody article={article} />
    </div>
  );
}
