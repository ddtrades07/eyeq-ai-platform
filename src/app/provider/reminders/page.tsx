import { Bell, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { requireStaffUser, requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import {
  REMINDER_CHANNEL_LABELS,
  REMINDER_TYPE_LABELS,
} from '@/lib/reminders/catalog';
import { formatDateTime } from '@/lib/utils';
import { hasPermission } from '@/lib/auth/rbac';
import { NewTemplateDialog } from '@/components/reminders/new-template-dialog';
import { NewCampaignDialog } from '@/components/reminders/new-campaign-dialog';
import { CampaignStatusActions } from '@/components/reminders/campaign-status';

export const metadata = { title: 'Reminders' };

export default async function RemindersPage() {
  const user = await requireStaffUser();
  await requirePermission('reminders:read');
  if (!user.organizationId) return null;

  const [templates, campaigns, deliveries] = await Promise.all([
    db.reminderTemplate.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
    }),
    db.reminderCampaign.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      include: { template: true },
    }),
    db.messageDeliveryLog.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
  ]);

  const canManage = hasPermission(user.role, 'reminders:manage');
  const canApprove = hasPermission(user.role, 'reminders:approve');

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Patient communication automation</h2>
          <p className="text-sm text-muted-foreground">
            Reminder templates, scheduled campaigns, and delivery logs across
            SMS, email, portal, and phone scripts.
          </p>
        </div>
        <div className="flex gap-2">
          {canManage ? <NewTemplateDialog /> : null}
          {canManage ? <NewCampaignDialog templates={templates.map((t) => ({ id: t.id, name: t.name }))} /> : null}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Reminder templates must not contain sensitive PHI by default. SMS
          requires a HIPAA-compliant vendor under a signed BAA (Twilio with
          BAA, etc.). Standard SendGrid is <strong>not</strong> HIPAA-compliant
          for PHI, use a HIPAA-compliant transactional provider for email.
        </p>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Delivery logs</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-primary" /> Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {campaigns.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="No campaigns yet"
                    description="Schedule a reminder campaign from a template."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.template?.name ?? 'No template'}
                          </div>
                        </TableCell>
                        <TableCell>{REMINDER_TYPE_LABELS[c.type]}</TableCell>
                        <TableCell>{REMINDER_CHANNEL_LABELS[c.channel]}</TableCell>
                        <TableCell>{formatDateTime(c.scheduledFor)}</TableCell>
                        <TableCell>
                          <Badge variant={campaignVariant(c.status)}>{c.status.toLowerCase()}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <CampaignStatusActions
                            id={c.id}
                            status={c.status}
                            canManage={canManage}
                            canApprove={canApprove}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Templates</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {templates.length === 0 ? (
                <div className="p-6">
                  <EmptyState title="No templates yet" description="Add your first reminder template." />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Locale</TableHead>
                      <TableHead>Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{t.body}</div>
                        </TableCell>
                        <TableCell>{REMINDER_TYPE_LABELS[t.type]}</TableCell>
                        <TableCell>{REMINDER_CHANNEL_LABELS[t.channel]}</TableCell>
                        <TableCell>{t.locale}</TableCell>
                        <TableCell>
                          <Badge variant={t.isActive ? 'success' : 'outline'}>
                            {t.isActive ? 'Active' : 'Off'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delivery logs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {deliveries.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="No delivery records yet"
                    description="Once a HIPAA-compliant vendor is wired in, every send and failure will land here."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{formatDateTime(d.createdAt)}</TableCell>
                        <TableCell>{d.channel}</TableCell>
                        <TableCell className="text-xs">{d.vendor ?? '-'}</TableCell>
                        <TableCell>
                          <Badge variant={d.status === 'DELIVERED' ? 'success' : d.status === 'FAILED' ? 'destructive' : 'info'}>
                            {d.status.toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{d.errorMessage ?? '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function campaignVariant(status: string) {
  switch (status) {
    case 'APPROVED':
    case 'SCHEDULED':
    case 'SENDING':
      return 'info' as const;
    case 'COMPLETED':
      return 'success' as const;
    case 'CANCELLED':
      return 'destructive' as const;
    case 'PENDING_APPROVAL':
      return 'warning' as const;
    default:
      return 'outline' as const;
  }
}
