import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requirePermission } from '@/lib/auth/require';
import { PatientImportForm } from '@/components/tasks/staff-task-panel';

export const metadata = { title: 'Data import' };

export default async function DataImportPage() {
  await requirePermission('patients:create');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data import"
        description="Import patients from CSV. Preview and dry-run before committing records."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Patient CSV import</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Required columns: <code>first_name</code>, <code>last_name</code>, <code>date_of_birth</code> (YYYY-MM-DD).
            Optional: <code>email</code>, <code>phone</code>, <code>mrn</code>.
            Duplicate MRNs are skipped. All imports are audit-logged.
          </p>
          <PatientImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
