import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import { MigrationUploadPanel } from '@/components/migration/migration-upload-panel';
import { MigrationWorkflowActions } from '@/components/migration/migration-workflow-actions';

export default async function MigrationProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission('migration:create');
  const organizationId = user.organizationId!;
  const { id } = await params;

  const project = await db.migrationProject.findUnique({
    where: { id },
    include: {
      batches: { orderBy: { createdAt: 'desc' }, take: 20 },
      mappings: { take: 50 },
      stagingRecords: {
        where: { status: 'ERROR' },
        take: 20,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!project || project.organizationId !== organizationId) notFound();

  const statusCounts = await db.migrationStagingRecord.groupBy({
    by: ['status'],
    where: { projectId: id },
    _count: { id: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/provider/migration" className="text-sm text-primary hover:underline">
            Migration Center
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <p className="text-sm text-muted-foreground">
            Source: {project.sourceSystem.replace(/_/g, ' ')} · Status {project.status}
          </p>
        </div>
        <MigrationWorkflowActions projectId={project.id} />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {statusCounts.map((s) => (
          <div key={s.status} className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{s.status}</p>
            <p className="text-xl font-semibold">{s._count.id}</p>
          </div>
        ))}
      </div>

      <MigrationUploadPanel projectId={project.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload batches</CardTitle>
        </CardHeader>
        <CardContent className="divide-y text-sm">
          {project.batches.length === 0 ? (
            <p className="text-muted-foreground">No files uploaded yet.</p>
          ) : (
            project.batches.map((b) => (
              <div key={b.id} className="flex justify-between py-2">
                <span>
                  {b.fileName} · {b.domain} · {b.rowCount} rows
                </span>
                <Badge variant="outline">{b.isTrial ? 'Trial' : 'Final'}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Field mappings</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {project.mappings.length === 0 ? (
            <p className="text-muted-foreground">
              Mappings are created during validation from CSV headers. Upload a patients file first.
            </p>
          ) : (
            <ul className="divide-y">
              {project.mappings.map((m) => (
                <li key={m.id} className="flex justify-between py-2">
                  <span>
                    {m.sourceField} → {m.targetField}
                  </span>
                  {m.required ? <Badge variant="secondary">Required</Badge> : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {project.stagingRecords.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exception queue</CardTitle>
          </CardHeader>
          <CardContent className="divide-y text-sm">
            {project.stagingRecords.map((r) => (
              <div key={r.id} className="py-2">
                <p className="font-medium">{r.sourceRecordId}</p>
                <p className="text-xs text-destructive">{r.error}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {project.approvedAt ? (
        <p className="text-sm text-muted-foreground">
          Approved {formatDate(project.approvedAt)}
          {project.goLiveDate ? ` · Go-live ${formatDate(project.goLiveDate)}` : ''}
        </p>
      ) : null}
    </div>
  );
}
