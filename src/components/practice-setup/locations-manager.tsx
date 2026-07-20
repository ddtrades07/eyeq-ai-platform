'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Plus, Edit3, Save, X, Star, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  createLocation,
  updateLocation,
  setLocationActive,
} from '@/server/actions/organizations';

type LocationRow = {
  id: string;
  name: string;
  shortName: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  phone: string | null;
  rooms: number;
  isPrimary: boolean;
  active: boolean;
};

const emptyDraft: Omit<LocationRow, 'id' | 'active'> = {
  name: '',
  shortName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  region: '',
  postalCode: '',
  phone: '',
  rooms: 1,
  isPrimary: false,
};

export function LocationsManager({ locations }: { locations: LocationRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<LocationRow | null>(null);
  const [draft, setDraft] = React.useState({ ...emptyDraft });

  function openCreate() {
    setDraft({ ...emptyDraft });
    setCreating(true);
  }

  function openEdit(row: LocationRow) {
    setEditing(row);
    setDraft({
      name: row.name,
      shortName: row.shortName,
      addressLine1: row.addressLine1 ?? '',
      addressLine2: row.addressLine2 ?? '',
      city: row.city ?? '',
      region: row.region ?? '',
      postalCode: row.postalCode ?? '',
      phone: row.phone ?? '',
      rooms: row.rooms,
      isPrimary: row.isPrimary,
    });
  }

  function submit(isCreate: boolean) {
    startTransition(async () => {
      const payload = {
        name: draft.name.trim(),
        shortName: draft.shortName.trim(),
        addressLine1: draft.addressLine1 || null,
        addressLine2: draft.addressLine2 || null,
        city: draft.city || null,
        region: draft.region || null,
        postalCode: draft.postalCode || null,
        phone: draft.phone || null,
        rooms: Number(draft.rooms) || 1,
        isPrimary: draft.isPrimary,
      };
      const r = isCreate
        ? await createLocation(payload)
        : await updateLocation({ id: editing!.id, ...payload });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(isCreate ? 'Location added' : 'Location updated');
      setCreating(false);
      setEditing(null);
      router.refresh();
    });
  }

  function toggle(row: LocationRow) {
    startTransition(async () => {
      const r = await setLocationActive({ id: row.id, active: !row.active });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(row.active ? 'Location archived' : 'Location reactivated');
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Locations</CardTitle>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Add location</DialogTitle>
              <DialogDescription>
                Practice site that appointments and providers can be assigned to.
              </DialogDescription>
            </DialogHeader>
            <DraftForm
              draft={draft}
              setDraft={setDraft}
              pending={pending}
              submitLabel="Create"
              onSubmit={() => submit(true)}
              onCancel={() => setCreating(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {locations.length === 0 ? (
          <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No locations yet. Add your first site to start scheduling.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {locations.map((loc) => (
              <li key={loc.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{loc.name}</span>
                    <Badge variant="outline">{loc.shortName}</Badge>
                    {loc.isPrimary ? (
                      <Badge variant="secondary">
                        <Star className="h-3 w-3" /> Primary
                      </Badge>
                    ) : null}
                    {!loc.active ? <Badge variant="destructive">Archived</Badge> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {[
                      loc.addressLine1,
                      loc.city,
                      loc.region,
                      loc.postalCode,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'No address on file'}
                    {loc.phone ? ` · ${loc.phone}` : ''} · {loc.rooms} room{loc.rooms === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(loc)}
                    disabled={pending}
                  >
                    <Edit3 className="h-4 w-4" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={loc.active ? 'outline' : 'default'}
                    onClick={() => toggle(loc)}
                    disabled={pending}
                  >
                    {loc.active ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {loc.active ? 'Archive' : 'Reactivate'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {editing ? (
          <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Edit {editing.name}</DialogTitle>
                <DialogDescription>
                  Update address, phone, room count, or set this as the primary
                  location.
                </DialogDescription>
              </DialogHeader>
              <DraftForm
                draft={draft}
                setDraft={setDraft}
                pending={pending}
                submitLabel="Save"
                onSubmit={() => submit(false)}
                onCancel={() => setEditing(null)}
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DraftForm({
  draft,
  setDraft,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  draft: typeof emptyDraft;
  setDraft: React.Dispatch<React.SetStateAction<typeof emptyDraft>>;
  pending: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.name.trim() || !draft.shortName.trim()) {
          toast.error('Name and short name are required');
          return;
        }
        onSubmit();
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" required>
          <Input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </Field>
        <Field label="Short name" required>
          <Input
            value={draft.shortName}
            onChange={(e) => setDraft((d) => ({ ...d, shortName: e.target.value }))}
            placeholder="e.g. Main"
          />
        </Field>
      </div>
      <Field label="Address line 1">
        <Input
          value={draft.addressLine1 ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, addressLine1: e.target.value }))}
        />
      </Field>
      <Field label="Address line 2">
        <Input
          value={draft.addressLine2 ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, addressLine2: e.target.value }))}
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="City">
          <Input
            value={draft.city ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
          />
        </Field>
        <Field label="State / region">
          <Input
            value={draft.region ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, region: e.target.value }))}
          />
        </Field>
        <Field label="ZIP / postal">
          <Input
            value={draft.postalCode ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, postalCode: e.target.value }))}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone">
          <Input
            value={draft.phone ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
          />
        </Field>
        <Field label="Rooms">
          <Input
            type="number"
            min={1}
            max={50}
            value={draft.rooms}
            onChange={(e) =>
              setDraft((d) => ({ ...d, rooms: Number(e.target.value) || 1 }))
            }
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.isPrimary}
          onChange={(e) =>
            setDraft((d) => ({ ...d, isPrimary: e.target.checked }))
          }
        />
        Set as primary location
      </label>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}{required ? ' *' : ''}
      </Label>
      {children}
    </div>
  );
}
