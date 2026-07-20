import Link from 'next/link';
import { GalleryVerticalEnd, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { formatDate, formatFullName } from '@/lib/utils';

export const metadata = { title: 'Imaging timeline' };

export default async function ImagingTimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; patient?: string }>;
}) {
  const user = await requirePermission('imaging:read');
  if (!user.organizationId) return null;
  const params = await searchParams;

  // Patient list with imaging counts for the left-rail picker.
  const patients = await db.patient.findMany({
    where: {
      organizationId: user.organizationId,
      archivedAt: null,
      imagingCases: { some: {} },
      ...(params.q
        ? {
            OR: [
              { firstName: { contains: params.q, mode: 'insensitive' } },
              { lastName: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      _count: { select: { imagingCases: true } },
    },
    orderBy: { lastName: 'asc' },
    take: 100,
  });

  // Default to the first patient if none selected.
  const activeId = params.patient ?? patients[0]?.id ?? null;

  const cases = activeId
    ? await db.imagingCase.findMany({
        where: { patientId: activeId, organizationId: user.organizationId },
        orderBy: { capturedAt: 'desc' },
        include: { signedBy: { select: { firstName: true, lastName: true } } },
      })
    : [];

  // Group by year for the timeline column.
  const byYear = new Map<number, typeof cases>();
  for (const c of cases) {
    const y = c.capturedAt.getFullYear();
    const list = byYear.get(y) ?? [];
    list.push(c);
    byYear.set(y, list);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);

  const activePatient = patients.find((p) => p.id === activeId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Imaging timeline</h2>
        <p className="text-sm text-muted-foreground">
          Chronological view of every imaging study captured for a patient.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
        <Card>
          <CardContent className="space-y-3 p-4">
            <form>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  name="q"
                  placeholder="Search patient"
                  defaultValue={params.q ?? ''}
                  className="pl-8"
                />
              </div>
            </form>
            {patients.length === 0 ? (
              <p className="rounded border border-dashed bg-muted/30 p-3 text-center text-xs text-muted-foreground">
                No patients have imaging yet.
              </p>
            ) : (
              <ul className="-mx-1 max-h-[60vh] space-y-1 overflow-y-auto">
                {patients.map((p) => {
                  const isActive = p.id === activeId;
                  const params = new URLSearchParams();
                  params.set('patient', p.id);
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/provider/imaging-timeline?${params.toString()}`}
                        className={
                          'block rounded-md px-2 py-1.5 text-sm ' +
                          (isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent')
                        }
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">
                            {formatFullName(p.firstName, p.lastName)}
                          </span>
                          <span className="text-[10px] opacity-70">
                            {p._count.imagingCases}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!activePatient ? (
            <EmptyState
              icon={GalleryVerticalEnd}
              title="Pick a patient to view their imaging timeline"
            />
          ) : cases.length === 0 ? (
            <EmptyState
              icon={GalleryVerticalEnd}
              title={`No imaging on file for ${formatFullName(activePatient.firstName, activePatient.lastName)}`}
            />
          ) : (
            <>
              <h3 className="text-lg font-medium">
                {formatFullName(activePatient.firstName, activePatient.lastName)} ·{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  {cases.length} imaging studies
                </span>
              </h3>
              {years.map((y) => {
                const yearCases = byYear.get(y)!;
                return (
                  <section key={y} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {y}
                      </span>
                      <span className="h-px flex-1 bg-border" />
                      <Badge variant="outline">{yearCases.length}</Badge>
                    </div>
                    <ul className="relative ml-2 space-y-2 border-l pl-4">
                      {yearCases.map((c) => (
                        <li key={c.id} className="relative">
                          <span className="absolute -left-[1.4rem] top-2 h-2 w-2 rounded-full bg-primary" />
                          <Link
                            href={`/provider/imaging/${c.id}`}
                            className="block rounded-md border bg-card px-3 py-2 hover:border-primary/40"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="text-sm font-medium">
                                  {c.imageType.replace('_', ' ')}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(c.capturedAt)}
                                  {c.signedBy
                                    ? ` · signed by ${formatFullName(c.signedBy.firstName, c.signedBy.lastName)}`
                                    : ''}
                                </div>
                              </div>
                              <div className="flex gap-1.5">
                                <Badge
                                  variant={
                                    c.status === 'PROVIDER_SIGNED'
                                      ? 'success'
                                      : 'info'
                                  }
                                >
                                  {c.status.replace('_', ' ')}
                                </Badge>
                                {c.aiUrgency ? (
                                  <Badge
                                    variant={
                                      c.aiUrgency === 'routine'
                                        ? 'secondary'
                                        : 'warning'
                                    }
                                  >
                                    AI: {c.aiUrgency}
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
