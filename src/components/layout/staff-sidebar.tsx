'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsLeft, ChevronsRight, Sparkles } from 'lucide-react';
import { useCopilotStore } from '@/store/copilot';
import { cn } from '@/lib/utils';
import { hasAnyPermission, ROLE_LABELS } from '@/lib/auth/rbac';
import type { Role } from '@prisma/client';
import { useT } from '@/components/providers/locale-provider';
import { getStaffNavSections } from '@/lib/navigation/staff-nav';
import { EyeQLogo } from '@/components/brand/eyeq-logo';

const COLLAPSED_KEY = 'eyeq.sidebar.collapsed';

export function StaffSidebar({
  role,
  orgName,
  userName,
}: {
  role: Role;
  orgName: string;
  userName: string;
}) {
  const pathname = usePathname();
  const t = useT();
  const openCopilot = useCopilotStore((s) => s.setOpen);
  const sections = getStaffNavSections(role);
  const showCopilot = hasAnyPermission(role, ['ai:use', 'scribe:use', 'notes:write']);
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === '1');
    } catch {
      // ignore
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <aside
      className={cn(
        'glass-sidebar hidden shrink-0 lg:flex lg:flex-col transition-[width] duration-lens',
        collapsed ? 'w-[4.5rem]' : 'w-64',
      )}
    >
      <div
        className={cn(
          'flex items-center border-b border-border/60 px-3 py-3',
          collapsed ? 'justify-center' : 'gap-2.5 px-4',
        )}
      >
        <EyeQLogo
          compact={collapsed}
          size="nav"
          variant={collapsed ? 'icon' : 'mark'}
          className={cn('shrink-0', !collapsed && 'max-w-[9.5rem]')}
        />
        {!collapsed ? (
          <div className="min-w-0 leading-tight">
            <div className="text-[11px] text-muted-foreground">Practice workspace</div>
          </div>
        ) : null}
      </div>

      {!collapsed ? (
        <div className="border-b border-border/60 px-4 py-3 text-sm">
          <div className="truncate font-medium">{orgName}</div>
          <div className="mt-1 inline-flex rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {ROLE_LABELS[role]}
          </div>
        </div>
      ) : null}

      <nav className="flex-1 space-y-3 overflow-y-auto px-2 py-3 scrollbar-thin">
        {sections.map((section) => (
          <div key={section.label} className="space-y-0.5">
            {!collapsed ? (
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {t(section.label)}
              </div>
            ) : null}
            {section.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              const label = t(item.label);
              return (
                <Link
                  key={`${section.label}-${item.href}-${item.label}`}
                  href={item.href}
                  title={collapsed ? label : undefined}
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors duration-lens',
                    collapsed && 'justify-center px-2',
                    active
                      ? 'glass-nav-active'
                      : 'text-muted-foreground hover:bg-white/55 hover:text-foreground dark:hover:bg-white/5',
                  )}
                >
                  {active ? (
                    <span
                      className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-white/90"
                      aria-hidden
                    />
                  ) : null}
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed ? <span className="truncate">{label}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {showCopilot ? (
        <div className="border-t border-border/60 px-2 py-2">
          <button
            type="button"
            onClick={() => openCopilot(true)}
            title={collapsed ? t('nav.aiAssistant') : undefined}
            aria-label={t('nav.aiAssistant')}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-300',
              collapsed && 'justify-center',
            )}
          >
            <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            {!collapsed ? t('nav.aiAssistant') : null}
          </button>
        </div>
      ) : null}

      <div className="border-t border-border/60 px-2 py-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/55 dark:hover:bg-white/5',
            collapsed && 'justify-center',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" />
              Collapse
            </>
          )}
        </button>
        {!collapsed ? (
          <div className="mt-1 px-2.5 pb-2 text-xs">
            <div className="font-medium text-foreground">{userName}</div>
            <div className="text-muted-foreground">{ROLE_LABELS[role]}</div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
