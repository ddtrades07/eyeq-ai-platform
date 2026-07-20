'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const APPT_TYPES: { value: string; label: string }[] = [
  { value: 'COMPREHENSIVE_EYE_EXAM', label: 'Comprehensive exam' },
  { value: 'CONTACT_LENS_EXAM', label: 'Contact lens' },
  { value: 'MEDICAL_OFFICE_VISIT', label: 'Medical office visit' },
  { value: 'DIABETIC_EYE_EXAM', label: 'Diabetic exam' },
  { value: 'DRY_EYE_FOLLOWUP', label: 'Dry eye follow-up' },
  { value: 'GLAUCOMA_FOLLOWUP', label: 'Glaucoma follow-up' },
  { value: 'EMERGENCY_VISIT', label: 'Emergency' },
  { value: 'OPTICAL_PICKUP', label: 'Optical pickup' },
];

export function FinancialFilters(props: {
  periodStart: string;
  periodEnd: string;
  locationId?: string;
  providerId?: string;
  appointmentType?: string;
  locations: { id: string; name: string }[];
  providers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  function update(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(search?.toString() ?? '');
    Object.entries(next).forEach(([k, v]) => {
      if (v && v !== 'all') params.set(k, v);
      else params.delete(k);
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Card>
      <CardContent className="grid gap-3 py-4 md:grid-cols-5">
        <div className="grid gap-1.5">
          <Label htmlFor="periodStart">From</Label>
          <Input
            id="periodStart"
            type="date"
            defaultValue={props.periodStart}
            onChange={(e) => update({ periodStart: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="periodEnd">To</Label>
          <Input
            id="periodEnd"
            type="date"
            defaultValue={props.periodEnd}
            onChange={(e) => update({ periodEnd: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Location</Label>
          <Select
            value={props.locationId ?? 'all'}
            onValueChange={(v) => update({ locationId: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {props.locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Provider</Label>
          <Select
            value={props.providerId ?? 'all'}
            onValueChange={(v) => update({ providerId: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All providers</SelectItem>
              {props.providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Appointment type</Label>
          <Select
            value={props.appointmentType ?? 'all'}
            onValueChange={(v) => update({ appointmentType: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {APPT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-5 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              update({
                periodStart: undefined,
                periodEnd: undefined,
                locationId: undefined,
                providerId: undefined,
                appointmentType: undefined,
              })
            }
          >
            Clear filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
