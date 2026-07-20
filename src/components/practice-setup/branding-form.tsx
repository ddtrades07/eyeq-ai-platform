'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ConnectedEhrVendor,
  PracticeMode,
  SupportedLocale,
} from '@prisma/client';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
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
import { updateOrganization } from '@/server/actions/organizations';

type Initial = {
  name: string;
  primaryColor: string | null;
  practiceMode: PracticeMode;
  connectedEhr: ConnectedEhrVendor;
  timezone: string;
  defaultLocale: SupportedLocale;
};

const TIMEZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'UTC',
];

export function BrandingForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [name, setName] = React.useState(initial.name);
  const [primaryColor, setPrimaryColor] = React.useState(initial.primaryColor ?? '#0ea5e9');
  const [practiceMode, setPracticeMode] = React.useState<PracticeMode>(initial.practiceMode);
  const [connectedEhr, setConnectedEhr] = React.useState<ConnectedEhrVendor>(initial.connectedEhr);
  const [timezone, setTimezone] = React.useState(initial.timezone);
  const [defaultLocale, setDefaultLocale] = React.useState<SupportedLocale>(initial.defaultLocale);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const r = await updateOrganization({
        name,
        primaryColor,
        practiceMode,
        connectedEhr: practiceMode === PracticeMode.CONNECTED_EHR ? connectedEhr : ConnectedEhrVendor.NONE,
        timezone,
        defaultLocale,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Practice profile saved');
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="org-name">Practice name</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-color">Primary color</Label>
          <div className="flex items-center gap-2">
            <Input
              id="org-color"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-16 p-1"
            />
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Practice mode</Label>
          <Select
            value={practiceMode}
            onValueChange={(v) => setPracticeMode(v as PracticeMode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PracticeMode.NATIVE_EHR}>
                Native EHR (EyeQ AI is your EHR)
              </SelectItem>
              <SelectItem value={PracticeMode.CONNECTED_EHR}>
                Connected EHR (integrate with existing EHR)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Connected EHR vendor</Label>
          <Select
            value={connectedEhr}
            onValueChange={(v) => setConnectedEhr(v as ConnectedEhrVendor)}
            disabled={practiceMode !== PracticeMode.CONNECTED_EHR}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ConnectedEhrVendor).map((v) => (
                <SelectItem key={v} value={v}>
                  {v.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Default language</Label>
          <Select
            value={defaultLocale}
            onValueChange={(v) => setDefaultLocale(v as SupportedLocale)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(SupportedLocale).map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save practice profile
        </Button>
      </div>
    </form>
  );
}
