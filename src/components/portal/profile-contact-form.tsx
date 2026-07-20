'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updatePatientContact } from '@/server/actions/portal';
import { toast } from 'sonner';

type ContactValues = {
  phone: string;
  email: string;
  addressLine1: string;
  city: string;
  region: string;
  postalCode: string;
};

export function ProfileContactForm({ initial }: { initial: ContactValues }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? '').trim();
    const payload = {
      phone: String(fd.get('phone') ?? ''),
      ...(email ? { email } : {}),
      addressLine1: String(fd.get('addressLine1') ?? ''),
      city: String(fd.get('city') ?? ''),
      region: String(fd.get('region') ?? ''),
      postalCode: String(fd.get('postalCode') ?? ''),
    };

    startTransition(async () => {
      const result = await updatePatientContact(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Contact details updated.');
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={initial.phone} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={initial.email} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="addressLine1">Street address</Label>
        <Input id="addressLine1" name="addressLine1" defaultValue={initial.addressLine1} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={initial.city} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="region">State</Label>
          <Input id="region" name="region" defaultValue={initial.region} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="postalCode">ZIP code</Label>
          <Input id="postalCode" name="postalCode" defaultValue={initial.postalCode} />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
      </Button>
    </form>
  );
}
