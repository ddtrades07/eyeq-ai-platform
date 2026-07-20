import Link from 'next/link';
import { AlertTriangle, Eye, ClipboardList, FileText, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WorkflowAlert } from '@/lib/intelligence/proactive';
import { cn } from '@/lib/utils';

const ICONS = {
  pre_chart: FileText,
  imaging_review: Eye,
  recall: ClipboardList,
  incomplete_intake: AlertTriangle,
  no_show_risk: AlertTriangle,
} as const;

const SEVERITY_STYLES = {
  info: 'border-l-indigo-400 bg-indigo-50/50',
  warning: 'border-l-amber-400 bg-amber-50/50',
  urgent: 'border-l-red-400 bg-red-50/50',
} as const;

export function ProactiveAlertsCard({ alerts }: { alerts: WorkflowAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-indigo-600" />
          Proactive insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((a) => {
          const Icon = ICONS[a.type] ?? Zap;
          return (
            <Link
              key={a.id}
              href={a.actionHref}
              className={cn(
                'flex items-start gap-3 rounded-lg border-l-4 px-3 py-2.5 text-sm transition-colors hover:brightness-95',
                SEVERITY_STYLES[a.severity],
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-muted-foreground">{a.detail}</div>
              </div>
              <span className="shrink-0 text-xs font-medium text-indigo-600">
                {a.actionLabel} →
              </span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
