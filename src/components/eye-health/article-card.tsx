import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ResolvedArticleSummary } from '@/lib/eye-health/service';
import { cn } from '@/lib/utils';

export function EyeHealthArticleCard({
  article,
  hrefBase,
  badgeExtra,
  saved,
}: {
  article: ResolvedArticleSummary;
  hrefBase: string;
  badgeExtra?: string;
  saved?: boolean;
}) {
  return (
    <Link href={`${hrefBase}/${article.slug}`} className="block h-full">
      <Card className="h-full transition-colors hover:border-primary/40">
        <CardHeader className="space-y-2 pb-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">Educational only</Badge>
            {article.isDemoContent ? <Badge variant="secondary">Demo content</Badge> : null}
            {article.practiceApproved ? <Badge variant="success">Practice approved</Badge> : null}
            {saved ? <Badge variant="info">Saved</Badge> : null}
            {badgeExtra ? <Badge variant="warning">{badgeExtra}</Badge> : null}
          </div>
          <CardTitle className="text-base leading-snug">{article.title}</CardTitle>
          <p className="text-xs text-muted-foreground">{article.categoryLabel}</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground line-clamp-3">{article.plainLanguageSummary}</p>
          <div className="flex flex-wrap gap-1">
            {article.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className={cn('rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground')}
              >
                {t}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground capitalize">
            Status: {article.orgReviewStatus.replace(/_/g, ' ')}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
