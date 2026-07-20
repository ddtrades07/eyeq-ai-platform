import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import { NewMigrationProjectDialog } from '@/components/migration/new-migration-project-dialog';

export const metadata = { title: 'Data Migration Center' };

export default async function MigrationCenterPage() {
  const user = await requirePermission('migration:create');
  const organizationId = user.organizationId!;

  const projects = await db.migrationProject.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      _count: { select: { stagingRecords: true, batches: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Data Migration Center</h1>
          <p className="text-sm text-muted-foreground">
            Guided migration with staging, validation, trial import, and reconciliation. Source data never
            writes directly to production tables.
          </p>
        </div>
        {hasPermission(user.role, 'migration:create') ? <NewMigrationProjectDialog /> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Migration projects</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {projects.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No migration projects yet. Create one to begin discovery.
            </p>
          ) : (
            projects.map((p) => (
              <Link
                key={p.id}
                href={`/provider/migration/${p.id}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm hover:bg-muted/30"
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.sourceSystem.replace(/_/g, ' ')} · Started {formatDate(p.createdAt)} ·{' '}
                    {p._count.batches} batch(es) · {p._count.stagingRecords} staged row(s)
                  </p>
                </div>
                <Badge variant="outline">{p.status}</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
