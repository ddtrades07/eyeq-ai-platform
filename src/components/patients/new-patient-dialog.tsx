'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPatient } from '@/server/actions/patients';

export function NewPatientDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      firstName: String(fd.get('firstName') ?? ''),
      lastName: String(fd.get('lastName') ?? ''),
      dateOfBirth: new Date(String(fd.get('dateOfBirth') ?? '')),
      email: String(fd.get('email') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      preferredLanguage: 'en',
      hasDiabetes: fd.get('hasDiabetes') === 'on',
      hasHypertension: fd.get('hasHypertension') === 'on',
      hasGlaucomaPersonal: fd.get('hasGlaucomaPersonal') === 'on',
      hasGlaucomaFamily: fd.get('hasGlaucomaFamily') === 'on',
      isSmoker: fd.get('isSmoker') === 'on',
    };
    startTransition(async () => {
      const r = await createPatient(payload);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Patient added');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" /> Add patient
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New patient</DialogTitle>
          <DialogDescription>
            Demographics and high-level risk flags. The full chart can be completed later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" />
            </div>
          </div>
          <fieldset className="space-y-2 rounded-md border p-3 text-sm">
            <legend className="px-1 text-xs font-medium text-muted-foreground">Risk factors</legend>
            <label className="flex items-center gap-2"><input type="checkbox" name="hasDiabetes" /> Diabetes</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="hasHypertension" /> Hypertension</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="hasGlaucomaPersonal" /> Personal glaucoma</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="hasGlaucomaFamily" /> Family glaucoma</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="isSmoker" /> Current smoker</label>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create patient'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
