'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Languages } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/components/providers/locale-provider';
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n/config';
import { setPreferredLocale } from '@/server/actions/preferences';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function LanguageSelector() {
  const router = useRouter();
  const { locale, setLocale } = useLocale();
  const [pending, startTransition] = React.useTransition();

  function choose(next: Locale) {
    setLocale(next);
    startTransition(async () => {
      const result = await setPreferredLocale({ locale: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Change language" disabled={pending}>
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">{LOCALE_LABELS[locale].native}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Display language</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => choose(code)}
            className={code === locale ? 'font-semibold text-primary' : undefined}
          >
            {LOCALE_LABELS[code].native}
            <span className="ml-2 text-xs text-muted-foreground">
              {LOCALE_LABELS[code].english}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
          Clinical translations require provider review.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
