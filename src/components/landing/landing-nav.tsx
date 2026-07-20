'use client';

import * as React from 'react';
import Link from 'next/link';
import { Eye, Menu, X } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '#for-practices', label: 'For Practices' },
  { href: '#for-patients', label: 'For Patients' },
  { href: '#how-eyeq-helps', label: 'How EyeQ Helps' },
  { href: '#our-approach', label: 'Our Approach' },
  { href: '#trust', label: 'Trust & Privacy' },
] as const;

export function LandingNav() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-landing-border/60 bg-landing-bg/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-teal focus-visible:ring-offset-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-landing-navy text-white shadow-sm">
            <Eye className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 leading-tight">
            <span className="block font-semibold tracking-tight text-landing-navy">EyeQ AI</span>
            <span className="hidden text-xs text-landing-muted sm:block">A home for connected eye care</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-landing-muted transition-colors hover:bg-landing-sand/40 hover:text-landing-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-teal"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login?next=/portal" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-landing-navy')}>
            Patient Portal
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'border-landing-border text-landing-navy')}>
            Practice Sign In
          </Link>
          <Link
            href="/contact"
            className={cn(buttonVariants({ size: 'sm' }), 'bg-landing-navy text-white hover:bg-landing-navy/90')}
          >
            Meet EyeQ
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
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block rounded-md px-3 py-2.5 text-sm font-medium text-landing-navy"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2 border-t border-landing-border/60 pt-4">
            <Button asChild variant="outline" className="w-full border-landing-border">
              <Link href="/login?next=/portal" onClick={() => setOpen(false)}>
                Patient Portal
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full border-landing-border">
              <Link href="/login" onClick={() => setOpen(false)}>
                Practice Sign In
              </Link>
            </Button>
            <Button asChild className="w-full bg-landing-navy hover:bg-landing-navy/90">
              <Link href="/contact" onClick={() => setOpen(false)}>
                Meet EyeQ
              </Link>
            </Button>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
