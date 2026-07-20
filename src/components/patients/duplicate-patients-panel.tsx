'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { findPatientDuplicates } from '@/server/actions/patient-duplicates';
import { formatDate, formatFullName } from '@/lib/utils';

type Duplicate = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phone: string | null;
  email: string | null;
  matchReasons: string[];
};

export function DuplicatePatientsPanel() {
  const [pending, startTransition] = React.useTransition();
  const [duplicates, setDuplicates] = React.useState<Duplicate[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  function scan() {
    startTransition(async () => {
      const r = await findPatientDuplicates({});
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setDuplicates(
        r.data.duplicates.map((d) => ({
          ...d,
          dateOfBirth: new Date(d.dateOfBirth),
        })),
      );
      setLoaded(true);
      toast.message(`Found ${r.data.duplicates.length} potential duplicate record(s)`);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">Potential duplicate patients</CardTitle>
          <p className="text-sm text-muted-foreground">
            Deterministic matching on phone, email, name + DOB, and legacy IDs.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={scan} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
          Scan
        </Button>
      </CardHeader>
      <CardContent>
        {!loaded ? (
          <p className="text-sm text-muted-foreground">
            Run a scan to find patients who may need review before merge.
          </p>
        ) : duplicates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No potential duplicates found in this practice.</p>
        ) : (
          <div className="divide-y">
            {duplicates.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <Link href={`/provider/patients/${d.id}`} className="font-medium hover:underline">
                    {formatFullName(d.firstName, d.lastName)}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    DOB {formatDate(d.dateOfBirth)}
                    {d.phone ? ` · ${d.phone}` : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {d.matchReasons.map((reason) => (
                      <Badge key={reason} variant="secondary" className="text-xs">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/provider/patients/${d.id}`}>Review</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
