'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { AppNotification } from '@/server/queries/notifications';

export function NotificationBellClient({ items }: { items: AppNotification[] }) {
  const count = items.length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative rounded-xl border border-transparent hover:border-border/70 hover:bg-white/60 dark:hover:bg-white/5"
        >
          <Bell className="h-4 w-4" />
          {count > 0 ? (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {count > 9 ? '9+' : count}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 glass-card-strong">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <Badge variant="secondary" className="text-[10px]">
            {count}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            You&apos;re caught up. Clinical alerts and practice notices appear here.
          </div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.id} asChild className="cursor-pointer items-start gap-2 py-2.5">
              <Link href={item.href}>
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-snug">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.detail}</div>
                </div>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
