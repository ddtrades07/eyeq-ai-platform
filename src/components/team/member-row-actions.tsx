'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@prisma/client';
import { toast } from 'sonner';
import { MoreHorizontal, Loader2, Copy, CheckCircle2 } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  resetTeamMemberPassword,
  setTeamMemberActive,
  updateTeamMember,
} from '@/server/actions/team';
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

export function MemberRowActions({
  id,
  email,
  currentRole,
  active,
  isSelf,
  inviterIsOwner,
}: {
  id: string;
  email: string;
  currentRole: Role;
  active: boolean;
  isSelf: boolean;
  inviterIsOwner: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [roleOpen, setRoleOpen] = React.useState(false);
  const [newRole, setNewRole] = React.useState<Role>(currentRole);
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  function toggleActive() {
    startTransition(async () => {
      const r = await setTeamMemberActive({ id, active: !active });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(active ? 'Teammate deactivated' : 'Teammate reactivated');
      router.refresh();
    });
  }

  function saveRole() {
    startTransition(async () => {
      const r = await updateTeamMember({ id, role: newRole });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Role updated');
      setRoleOpen(false);
      router.refresh();
    });
  }

  function resetPassword() {
    startTransition(async () => {
      const r = await resetTeamMemberPassword({ id });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setTempPassword(r.data.temporaryPassword);
    });
  }

  async function copyPassword() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Clipboard blocked, copy manually.');
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Manage teammate</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => {
              setNewRole(currentRole);
              setRoleOpen(true);
            }}
          >
            Change role
          </DropdownMenuItem>
          <DropdownMenuItem onClick={resetPassword}>
            Reset password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={toggleActive}
            disabled={isSelf}
            className={active ? 'text-destructive' : ''}
          >
            {active ? 'Deactivate access' : 'Reactivate access'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>
              Updates what this teammate can see and do across EyeQ. Changes
              take effect on their next page load.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label>Role</Label>
            <Select
              value={newRole}
              onValueChange={(v) => setNewRole(v as Role)}
            >
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
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRoleOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button onClick={saveRole} disabled={pending || newRole === currentRole}>
              Save role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={tempPassword !== null}
        onOpenChange={(o) => {
          if (!o) {
            setTempPassword(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Temporary password</DialogTitle>
            <DialogDescription>
              Share this one-time password with{' '}
              <span className="font-medium text-foreground">{email}</span>. It
              is shown only once.
            </DialogDescription>
          </DialogHeader>
          {tempPassword ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
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
          ) : null}
          <DialogFooter>
            <Button onClick={() => setTempPassword(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
