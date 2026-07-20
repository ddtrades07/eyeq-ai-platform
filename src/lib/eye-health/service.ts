import 'server-only';

import { EyeHealthOrgReviewStatus, type EyeHealthRecommendationContext } from '@prisma/client';
import { db } from '@/lib/db';
import { cachedEyeHealthOrgStates } from '@/lib/cache/safe-cache';
import {
  getEyeHealthArticle,
  listEyeHealthSummaries,
  searchEyeHealthArticles,
  type EyeHealthArticle,
  type EyeHealthArticleSummary,
  type EyeHealthCatalogReviewStatus,
  type EyeHealthCategoryId,
} from '@/lib/eye-health/catalog';

export type ResolvedArticleSummary = EyeHealthArticleSummary & {
  orgReviewStatus: EyeHealthCatalogReviewStatus | 'hidden' | 'archived';
  practiceApproved: boolean;
  educationalOnly: true;
};

function mapOrgStatus(
  status: EyeHealthOrgReviewStatus | undefined,
  catalog: EyeHealthCatalogReviewStatus,
): EyeHealthCatalogReviewStatus | 'hidden' | 'archived' {
  if (!status) return catalog;
  switch (status) {
    case 'HIDDEN':
      return 'hidden';
    case 'ARCHIVED':
      return 'archived';
    case 'PRACTICE_APPROVED':
      return 'practice_approved';
    case 'PROVIDER_REVIEWED':
      return 'provider_reviewed';
    case 'DRAFT':
    default:
      return 'draft';
  }
}

export async function listVisibleArticleSummaries(args: {
  organizationId: string;
  query?: string;
  category?: EyeHealthCategoryId | 'all';
  includeHiddenForStaff?: boolean;
}): Promise<ResolvedArticleSummary[]> {
  const states = await cachedEyeHealthOrgStates(args.organizationId, () =>
    db.eyeHealthOrgArticleState.findMany({
      where: { organizationId: args.organizationId },
      select: { slug: true, reviewStatus: true, hidden: true },
    }),
  );

  const bySlug = new Map(states.map((s) => [s.slug, s]));
  const base = args.query
    ? searchEyeHealthArticles(args.query, args.category)
    : listEyeHealthSummaries().filter(
        (a) => !args.category || args.category === 'all' || a.category === args.category,
      );

  return base
    .map((a) => {
      const st = bySlug.get(a.slug);
      const orgReviewStatus = st?.hidden
        ? ('hidden' as const)
        : mapOrgStatus(st?.reviewStatus, a.reviewStatus);
      return {
        ...a,
        orgReviewStatus,
        practiceApproved: orgReviewStatus === 'practice_approved',
        educationalOnly: true as const,
      };
    })
    .filter((a) => {
      if (args.includeHiddenForStaff) return a.orgReviewStatus !== 'archived';
      return a.orgReviewStatus !== 'hidden' && a.orgReviewStatus !== 'archived';
    });
}

export async function getResolvedArticle(
  organizationId: string,
  slug: string,
  opts?: { allowHidden?: boolean },
): Promise<(EyeHealthArticle & { orgReviewStatus: ResolvedArticleSummary['orgReviewStatus'] }) | null> {
  const article = getEyeHealthArticle(slug);
  if (!article) return null;
  const st = await db.eyeHealthOrgArticleState.findUnique({
    where: { organizationId_slug: { organizationId, slug } },
  });
  const orgReviewStatus = st?.hidden
    ? ('hidden' as const)
    : mapOrgStatus(st?.reviewStatus, article.reviewStatus);
  if (!opts?.allowHidden && (orgReviewStatus === 'hidden' || orgReviewStatus === 'archived')) {
    return null;
  }
  return { ...article, orgReviewStatus };
}

export async function listPatientRecommendations(organizationId: string, patientId: string) {
  const rows = await db.eyeHealthRecommendation.findMany({
    where: { organizationId, patientId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      slug: true,
      context: true,
      note: true,
      createdAt: true,
      recommendedBy: { select: { firstName: true, lastName: true } },
    },
  });
  return rows
    .map((r) => {
      const article = getEyeHealthArticle(r.slug);
      if (!article) return null;
      return {
        ...r,
        title: article.title,
        summary: article.plainLanguageSummary,
        category: article.category,
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    slug: string;
    context: EyeHealthRecommendationContext;
    note: string | null;
    createdAt: Date;
    recommendedBy: { firstName: string; lastName: string };
    title: string;
    summary: string;
    category: string;
  }>;
}

export async function listSavedSlugs(patientId: string): Promise<Set<string>> {
  const rows = await db.eyeHealthSavedArticle.findMany({
    where: { patientId },
    select: { slug: true },
  });
  return new Set(rows.map((r) => r.slug));
}

export function explainArticlePlain(article: EyeHealthArticle): string {
  return [
    `Here is a simpler overview of “${article.title}” (education only, not a diagnosis).`,
    article.plainLanguageSummary,
    `What it means: ${article.whatItMeans}`,
    `Common topics people ask about: ${article.commonSymptoms.slice(0, 4).join('; ')}.`,
    `Questions you can bring to your provider: ${article.questionsToAskProvider.slice(0, 3).join(' ')}`,
    'For your personal diagnosis or treatment plan, follow your provider’s instructions or message the office.',
  ].join('\n\n');
}
