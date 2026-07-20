'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adjustInventory, archiveInventoryItem } from '@/server/actions/inventory';

type AdjustType = 'RECEIVED' | 'SOLD' | 'RETURNED' | 'DAMAGED' | 'COUNTED';

export function InventoryRowActions({
  id,
  canAdjust,
  canManage,
}: {
  id: string;
  canAdjust: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<AdjustType>('RECEIVED');
  const [pending, startTransition] = React.useTransition();

  function adjust(formData: FormData) {
    startTransition(async () => {
      const r = await adjustInventory({
        id,
        type,
        quantity: Number(formData.get('qty') ?? 0),
        reason: String(formData.get('reason') ?? '') || null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Inventory updated');
      setOpen(false);
      router.refresh();
    });
  }

  function archive() {
    startTransition(async () => {
      const r = await archiveInventoryItem({ id });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Item archived');
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Adjust</DropdownMenuLabel>
          <DropdownMenuItem disabled={!canAdjust} onClick={() => { setType('RECEIVED'); setOpen(true); }}>
            Receive stock
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canAdjust} onClick={() => { setType('SOLD'); setOpen(true); }}>
            Sold
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canAdjust} onClick={() => { setType('RETURNED'); setOpen(true); }}>
            Returned
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canAdjust} onClick={() => { setType('DAMAGED'); setOpen(true); }}>
            Damaged
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canAdjust} onClick={() => { setType('COUNTED'); setOpen(true); }}>
            Cycle count
          </DropdownMenuItem>
          {canManage ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={archive} className="text-destructive">
                Archive item
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust inventory</DialogTitle>
            <DialogDescription>
              {type === 'COUNTED'
                ? 'Set the on-hand quantity to the result of your cycle count.'
                : 'Record an inventory movement.'}
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            action={(formData) => adjust(formData)}
          >
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as AdjustType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEIVED">Received</SelectItem>
                  <SelectItem value="SOLD">Sold</SelectItem>
                  <SelectItem value="RETURNED">Returned</SelectItem>
                  <SelectItem value="DAMAGED">Damaged</SelectItem>
                  <SelectItem value="COUNTED">Cycle count</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="qty">{type === 'COUNTED' ? 'New on-hand' : 'Quantity'}</Label>
              <Input id="qty" name="qty" type="number" min={1} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="reason">Reason / note</Label>
              <Input id="reason" name="reason" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
