'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@prisma/client';
import { toast } from 'sonner';
import { Loader2, UserPlus, Copy, CheckCircle2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { inviteTeamMember } from '@/server/actions/team';
import { ROLE_LABELS } from '@/lib/auth/rbac';

const STAFF_ROLES: Role[] = [
  Role.OWNER,
  Role.ADMIN,
  Role.MANAGER,
  Role.OPTOMETRIST,
  Role.MD,
  Role.RESIDENT,
  Role.TECHNICIAN,
  Role.FRONT_DESK,
  Role.OPTICAL,
  Role.SCRIBE,
  Role.BILLING,
];

const PROVIDER_ROLES: Role[] = [Role.OPTOMETRIST, Role.MD, Role.RESIDENT];

export function InviteDialog({
  inviterIsOwner,
}: {
  inviterIsOwner: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<Role>(Role.FRONT_DESK);
  const [credentials, setCredentials] = React.useState('');
  const [npi, setNpi] = React.useState('');
  const isProvider = PROVIDER_ROLES.includes(role);

  function reset() {
    setFirstName('');
    setLastName('');
    setEmail('');
    setRole(Role.FRONT_DESK);
    setCredentials('');
    setNpi('');
    setTempPassword(null);
    setCopied(false);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const r = await inviteTeamMember({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        role,
        generatePassword: true,
        credentials: isProvider ? credentials.trim() || null : null,
        npi: isProvider ? npi.trim() || null : null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Invited ${firstName} ${lastName}`);
      setTempPassword(r.data.temporaryPassword);
      router.refresh();
    });
  }

  async function copyPassword() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Clipboard blocked, copy the password manually.');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" /> Invite teammate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        {tempPassword ? (
          <>
            <DialogHeader>
              <DialogTitle>Invite created</DialogTitle>
              <DialogDescription>
                Share this temporary password with{' '}
                <span className="font-medium text-foreground">
                  {firstName} {lastName}
                </span>
                . It is shown ONLY this once, copy it now. They&apos;ll be
                prompted to change it at first sign-in.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5 rounded-md border bg-muted/40 p-3">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Email
                </Label>
                <code className="block break-all rounded bg-background px-2 py-1 text-sm">
                  {email}
                </code>
              </div>
              <div className="space-y-1.5 rounded-md border bg-muted/40 p-3">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Temporary password
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded bg-background px-2 py-1.5 font-mono text-sm">
                    {tempPassword}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={copyPassword}
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Sign-in URL:{' '}
                <code className="rounded bg-muted px-1 py-0.5">/login</code>
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <DialogHeader>
              <DialogTitle>Invite a teammate</DialogTitle>
              <DialogDescription>
                Creates a Supabase Auth account + EyeQ user. We&apos;ll show
                you a one-time temporary password to share.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" required>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                />
              </Field>
              <Field label="Last name" required>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Email" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@yourpractice.com"
              />
            </Field>

            <Field label="Role" required>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.filter(
                    (r) => inviterIsOwner || r !== Role.OWNER,
                  ).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {isProvider ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Credentials">
                  <Input
                    value={credentials}
                    onChange={(e) => setCredentials(e.target.value)}
                    placeholder="OD, MD, DO"
                  />
                </Field>
                <Field label="NPI">
                  <Input
                    value={npi}
                    onChange={(e) => setNpi(e.target.value)}
                    placeholder="10-digit NPI"
                  />
                </Field>
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  pending || !firstName.trim() || !lastName.trim() || !email.trim()
                }
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Send invite
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
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
        {label}
        {required ? ' *' : ''}
      </Label>
      {children}
    </div>
  );
}
