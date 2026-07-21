'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, Sparkles, X } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { EyeQLogo } from '@/components/brand/eyeq-logo';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '/demo', label: 'Live Demo', isDemo: true },
  { href: '#for-practices', label: 'For Practices' },
  { href: '/login?next=/portal', label: 'Patient Login' },
  { href: '/login', label: 'Staff Login' },
] as const;

export function LandingNav({ liveDemoHref = '/demo' }: { liveDemoHref?: string }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const resolveHref = (link: (typeof NAV_LINKS)[number]) =>
    'isDemo' in link && link.isDemo ? liveDemoHref : link.href;

  return (
    <header className="sticky top-0 z-50 border-b border-landing-border/60 bg-landing-bg/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-teal focus-visible:ring-offset-2"
          aria-label="EyeQ home"
        >
          <EyeQLogo size="nav" variant="mark" priority />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV_LINKS.map((link) => {
            const href = resolveHref(link);
            const isHash = href.startsWith('#');
            if (isHash) {
              return (
                <a
                  key={link.label}
                  href={href}
                  className="rounded-md px-3 py-2 text-sm text-landing-muted transition-colors hover:bg-landing-sand/40 hover:text-landing-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-teal"
                >
                  {link.label}
                </a>
              );
            }
            return (
              <Link
                key={link.label}
                href={href}
                className="rounded-md px-3 py-2 text-sm text-landing-muted transition-colors hover:bg-landing-sand/40 hover:text-landing-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-teal"
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href={liveDemoHref}
            className={cn(
              buttonVariants({ size: 'sm' }),
              'bg-landing-teal text-white hover:bg-landing-teal/90',
            )}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Live Demo
          </Link>
          <Link
            href="/signup/practice"
            className={cn(buttonVariants({ size: 'sm' }), 'bg-landing-navy text-white hover:bg-landing-navy/90')}
          >
            Start Practice Setup
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-landing-border text-landing-navy lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <nav id="mobile-nav" className="border-t border-landing-border/60 bg-landing-bg px-5 py-4 lg:hidden" aria-label="Mobile">
          <ul className="space-y-1">
            {NAV_LINKS.map((link) => {
              const href = resolveHref(link);
              return (
                <li key={link.label}>
                  {href.startsWith('#') ? (
                    <a
                      href={href}
                      className="block rounded-md px-3 py-2.5 text-sm font-medium text-landing-navy"
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={href}
                      className="block rounded-md px-3 py-2.5 text-sm font-medium text-landing-navy"
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              );
            })}
            <li>
              <Link
                href="/pricing"
                className="block rounded-md px-3 py-2.5 text-sm text-landing-muted"
                onClick={() => setOpen(false)}
              >
                Membership (practice owners)
              </Link>
            </li>
          </ul>
          <div className="mt-4 flex flex-col gap-2 border-t border-landing-border/60 pt-4">
            <Button asChild className="w-full bg-landing-teal hover:bg-landing-teal/90">
              <Link href={liveDemoHref} onClick={() => setOpen(false)}>
                <Sparkles className="h-4 w-4" aria-hidden />
                Live Demo
              </Link>
            </Button>
            <Button asChild className="w-full bg-landing-navy hover:bg-landing-navy/90">
              <Link href="/signup/practice" onClick={() => setOpen(false)}>
                Start Practice Setup
              </Link>
            </Button>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
