import { AlertTriangle, Boxes, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { requireStaffUser, requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/auth/rbac';
import { formatCurrency } from '@/lib/utils';
import { resolveActiveLocationId } from '@/lib/location/server';
import { inventoryLocationFilter } from '@/lib/location/scope';
import { NewInventoryItemDialog } from '@/components/inventory/new-item-dialog';
import { InventoryRowActions } from '@/components/inventory/row-actions';

export const metadata = { title: 'Inventory' };

const CATEGORY_LABELS: Record<string, string> = {
  FRAMES: 'Frames',
  LENSES: 'Lenses',
  CONTACT_LENSES: 'Contact lenses',
  CL_TRIALS: 'CL trials',
  DROPS_AND_OTC: 'Drops & OTC',
  DRY_EYE_PRODUCTS: 'Dry eye products',
  DIAGNOSTIC_SUPPLIES: 'Diagnostic supplies',
  ACCESSORIES: 'Accessories',
  OTHER: 'Other',
};

export default async function InventoryPage() {
  const user = await requireStaffUser();
  await requirePermission('inventory:read');
  if (!user.organizationId) return null;

  const locationId = await resolveActiveLocationId({
    organizationId: user.organizationId,
    userId: user.id,
    role: user.role,
  });

  const items = await db.inventoryItem.findMany({
    where: {
      organizationId: user.organizationId,
      archivedAt: null,
      ...inventoryLocationFilter(locationId),
    },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  });

  const canSeeCosts = hasPermission(user.role, 'inventory:manage');
  const canAdjust = hasPermission(user.role, 'inventory:adjust');
  const canManage = hasPermission(user.role, 'inventory:manage');

  const totalValueCents = items.reduce((sum, i) => sum + i.costCents * i.quantityOnHand, 0);
  const lowStock = items.filter((i) => i.status === 'LOW_STOCK' || i.status === 'OUT_OF_STOCK');
  const aiSuggestions = buildAiSuggestions(items);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Inventory</h2>
          <p className="text-sm text-muted-foreground">
            Optical inventory, dry eye products, contact lens trials, and clinic supplies.
          </p>
        </div>
        {canManage ? <NewInventoryItemDialog /> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <Boxes className="h-5 w-5 text-primary" />
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Active SKUs</div>
              <div className="text-2xl font-semibold">{items.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Low / out of stock</div>
              <div className="text-2xl font-semibold">{lowStock.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Inventory cost (at cost)
            </div>
            <div className="text-2xl font-semibold">
              {canSeeCosts ? formatCurrency(totalValueCents) : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {canSeeCosts ? 'Visible to managers / admin only.' : 'Hidden from your role.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {aiSuggestions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> AI inventory suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {aiSuggestions.map((s, i) => (
                <li key={i} className="rounded-md border bg-muted/20 p-3">
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.detail}</div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Suggestions are heuristics on local data, review before reordering.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No items yet" description="Add your first SKU to get started." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">On hand</TableHead>
                  <TableHead className="text-right">Reorder at</TableHead>
                  {canSeeCosts ? <TableHead className="text-right">Cost</TableHead> : null}
                  <TableHead className="text-right">Retail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {i.brand ?? '-'} {i.sku ? `· ${i.sku}` : ''}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{CATEGORY_LABELS[i.category]}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{i.quantityOnHand}</TableCell>
                    <TableCell className="text-right text-sm">{i.reorderAt}</TableCell>
                    {canSeeCosts ? (
                      <TableCell className="text-right text-sm">
                        {formatCurrency(i.costCents)}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right text-sm">{formatCurrency(i.retailCents)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          i.status === 'OUT_OF_STOCK'
                            ? 'destructive'
                            : i.status === 'LOW_STOCK'
                              ? 'warning'
                              : i.status === 'DISCONTINUED'
                                ? 'outline'
                                : 'success'
                        }
                      >
                        {i.status.replace('_', ' ').toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <InventoryRowActions
                        id={i.id}
                        canAdjust={canAdjust}
                        canManage={canManage}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function buildAiSuggestions(items: { name: string; quantityOnHand: number; reorderAt: number; reorderQuantity: number; category: string }[]) {
  const suggestions: { title: string; detail: string }[] = [];
  const lowSet = items.filter((i) => i.quantityOnHand <= i.reorderAt);
  if (lowSet.length > 0) {
    suggestions.push({
      title: `${lowSet.length} item${lowSet.length === 1 ? '' : 's'} at or below reorder threshold`,
      detail: lowSet
        .slice(0, 5)
        .map((i) => `${i.name} (${i.quantityOnHand} on hand)`)
        .join(', '),
    });
  }
  const clTrials = items.filter((i) => i.category === 'CL_TRIALS');
  if (clTrials.length > 0 && clTrials.every((i) => i.quantityOnHand < 5)) {
    suggestions.push({
      title: 'Contact lens trials are running thin',
      detail: 'Consider a bulk replenishment before the next CL fit week.',
    });
  }
  const dry = items.filter((i) => i.category === 'DRY_EYE_PRODUCTS');
  if (dry.length > 0) {
    suggestions.push({
      title: 'Pair dry eye products with optical handoffs',
      detail: 'Patients leaving with dry eye Dx are 3× more likely to purchase preservative-free tears at checkout.',
    });
  }
  return suggestions;
}
