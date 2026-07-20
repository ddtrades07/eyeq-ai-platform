'use client';

import * as React from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createInventoryItem } from '@/server/actions/inventory';

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'FRAMES', label: 'Frames' },
  { value: 'LENSES', label: 'Lenses' },
  { value: 'CONTACT_LENSES', label: 'Contact lenses' },
  { value: 'CL_TRIALS', label: 'CL trials' },
  { value: 'DROPS_AND_OTC', label: 'Drops & OTC' },
  { value: 'DRY_EYE_PRODUCTS', label: 'Dry eye products' },
  { value: 'DIAGNOSTIC_SUPPLIES', label: 'Diagnostic supplies' },
  { value: 'ACCESSORIES', label: 'Accessories' },
  { value: 'OTHER', label: 'Other' },
];

export function NewInventoryItemDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [category, setCategory] = React.useState('FRAMES');
  const [pending, startTransition] = React.useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createInventoryItem({
        category: category as 'FRAMES',
        name: String(f.get('name') ?? ''),
        brand: String(f.get('brand') ?? '') || null,
        sku: String(f.get('sku') ?? '') || null,
        description: String(f.get('description') ?? '') || null,
        vendor: String(f.get('vendor') ?? '') || null,
        costCents: Math.round(Number(f.get('cost') ?? 0) * 100),
        retailCents: Math.round(Number(f.get('retail') ?? 0) * 100),
        quantityOnHand: Number(f.get('qty') ?? 0),
        reorderAt: Number(f.get('reorderAt') ?? 0),
        reorderQuantity: Number(f.get('reorderQty') ?? 0),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Item added');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add inventory item</DialogTitle>
          <DialogDescription>
            Track quantity, reorder threshold, and pricing.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <div className="md:col-span-2 grid gap-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid gap-1.5">
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" name="brand" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" name="sku" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="vendor">Vendor</Label>
            <Input id="vendor" name="vendor" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cost">Cost ($)</Label>
            <Input id="cost" name="cost" type="number" min={0} step="0.01" defaultValue={0} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="retail">Retail ($)</Label>
            <Input id="retail" name="retail" type="number" min={0} step="0.01" defaultValue={0} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="qty">Qty on hand</Label>
            <Input id="qty" name="qty" type="number" min={0} defaultValue={0} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="reorderAt">Reorder at</Label>
            <Input id="reorderAt" name="reorderAt" type="number" min={0} defaultValue={0} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="reorderQty">Reorder qty</Label>
            <Input id="reorderQty" name="reorderQty" type="number" min={0} defaultValue={0} />
          </div>
          <div className="md:col-span-2 grid gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
