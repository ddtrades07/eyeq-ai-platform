'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Camera,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  Heart,
  LayoutDashboard,
  Library,
  MessageCircle,
  Package,
  Shield,
  Sparkles,
  Stethoscope,
  Users,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  SAAS_PLAN_ORDER,
  SAAS_PLANS,
  formatPlanPrice,
} from '@/lib/billing/saas-plans';
import { LandingNav } from './landing-nav';
import { ConnectionVisual } from './connection-visual';
import { FadeIn } from './fade-in';
import { GlassLensBg } from './glass-lens-bg';
import { StickyPanel } from './sticky-panel';

const FEATURE_CARDS = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    body: 'See what needs attention across the day — visits, follow-ups, and team tasks.',
  },
  {
    icon: Calendar,
    title: 'Scheduling',
    body: 'Book, prepare, and keep appointment flow connected from front desk to chair.',
  },
  {
    icon: Stethoscope,
    title: 'Chart',
    body: 'Patient history, exams, and continuity in one place built for eye care.',
  },
  {
    icon: FileText,
    title: 'SOAP / Rx',
    body: 'Documentation and prescriptions with provider review before anything is finalized.',
  },
  {
    icon: Camera,
    title: 'Imaging',
    body: 'Organize imaging timelines so comparison and follow-up stay clear over time.',
  },
  {
    icon: Sparkles,
    title: 'AI Image Analysis',
    body: 'Draft findings for provider review only — never a diagnosis, never auto-released.',
  },
  {
    icon: Library,
    title: 'Eye Health Library',
    body: 'Practice-approved education patients can actually understand and return to.',
  },
  {
    icon: MessageCircle,
    title: 'Portal',
    body: 'Secure patient access for appointments, prescriptions, and provider-approved summaries.',
  },
  {
    icon: Heart,
    title: 'Reputation',
    body: 'Review and Q&A workflows that keep responses professional and PHI-safe.',
  },
  {
    icon: Package,
    title: 'Optical / Inventory',
    body: 'Orders, labs, and inventory tied to the same patient and visit context.',
  },
  {
    icon: CreditCard,
    title: 'Billing Drafts',
    body: 'Draft claims and statements with human review — not silent submission.',
  },
  {
    icon: ClipboardList,
    title: 'Practice Readiness',
    body: 'PHI gates, BAAs, MFA, and pilot checklists before live clinical data.',
  },
] as const;

const PROBLEMS = [
  { title: 'Outdated systems', body: 'Legacy software that slows every handoff between roles.' },
  { title: 'Scattered tools', body: 'Scheduling, charting, imaging, and messaging that never quite talk.' },
  { title: 'Slow clinical flow', body: 'Time lost searching for context instead of caring for the patient.' },
  { title: 'Poor ops visibility', body: 'Hard to see bottlenecks, recalls, and unfinished follow-up.' },
  { title: 'Manual busywork', body: 'Repetitive documentation and coordination that drains the team.' },
] as const;

const SOLUTIONS = [
  'One connected workspace for the whole care team',
  'Role-aware views for owners, providers, technicians, and front desk',
  'Imaging and notes that stay with the patient over time',
  'AI drafts that require provider review before clinical use',
  'Patient portal without charging patients for access',
  'Readiness gates that keep live PHI fail-closed until you are ready',
] as const;

export function LandingPageContent({ liveDemoHref = '/demo' }: { liveDemoHref?: string }) {
  return (
    <div className="landing-page min-h-screen bg-landing-bg text-landing-navy">
      <LandingNav liveDemoHref={liveDemoHref} />

      {/* 1. Hero */}
      <section className="relative overflow-hidden">
        <GlassLensBg />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
          <FadeIn blur>
            <p className="text-sm font-medium text-landing-teal">A connected home for modern eye care</p>
            <h1 className="landing-display mt-4 text-4xl font-semibold leading-[1.15] tracking-tight text-landing-navy sm:text-5xl lg:text-[3.25rem]">
              Eye care feels better when everything is connected.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-landing-muted">
              EyeQ brings your care team, appointments, charting, imaging, communication, and
              follow-up into one thoughtful platform — with AI that drafts, and providers who decide.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={liveDemoHref}
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'bg-landing-teal text-white shadow-md hover:bg-landing-teal/90',
                )}
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Live Demo
              </Link>
              <Link
                href="/contact"
                className={cn(
                  buttonVariants({ size: 'lg', variant: 'outline' }),
                  'border-landing-border bg-white/80 text-landing-navy',
                )}
              >
                Schedule Demo
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/pricing"
                className={cn(
                  buttonVariants({ size: 'lg', variant: 'ghost' }),
                  'text-landing-navy',
                )}
              >
                View pricing
              </Link>
            </div>
            <p className="mt-6 text-sm text-landing-muted">
              Live Demo is free — synthetic data only, no payment required.
            </p>
          </FadeIn>
          <FadeIn delay={120} className="relative">
            <div className="rounded-2xl border border-landing-border/80 bg-white/70 p-4 shadow-lg shadow-landing-navy/5 backdrop-blur-sm">
              <ConnectionVisual className="mx-auto h-auto w-full max-w-md" />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 2. Problem */}
      <section id="problem" className="border-y border-landing-border/60 bg-white/50 py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <FadeIn>
            <SectionHeading
              title="Practices are running on too many disconnected pieces."
              subtitle="Outdated systems, scattered tools, slow flow, weak ops visibility, and manual work add friction to every visit."
            />
          </FadeIn>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PROBLEMS.map((p, i) => (
              <FadeIn key={p.title} delay={i * 60} blur>
                <div className="h-full rounded-2xl border border-landing-border/80 bg-white p-5 shadow-sm">
                  <h3 className="font-semibold text-landing-navy">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-landing-muted">{p.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Solution */}
      <section id="solution" className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
          <StickyPanel>
            <FadeIn>
              <SectionHeading
                title="One connected platform for the whole practice."
                subtitle="EyeQ links clinical care, operations, and patient experience without forcing a rigid workflow."
              />
            </FadeIn>
          </StickyPanel>
          <ul className="space-y-3">
            {SOLUTIONS.map((item, i) => (
              <FadeIn key={item} delay={i * 50}>
                <li className="flex items-start gap-3 rounded-xl border border-landing-border/70 bg-white/80 px-4 py-3 text-sm text-landing-muted">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-landing-teal" aria-hidden />
                  {item}
                </li>
              </FadeIn>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. Feature cards */}
      <section id="features" className="bg-landing-sand/25 py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <FadeIn>
            <SectionHeading
              title="Built for the real day in clinic."
              subtitle="From the front desk to the chair to follow-up — every module stays in the same home."
            />
          </FadeIn>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_CARDS.map((f, i) => {
              const Icon = f.icon;
              return (
                <FadeIn key={f.title} delay={(i % 6) * 55} blur>
                  <div className="h-full rounded-2xl border border-landing-border/80 bg-white/90 p-6 shadow-sm transition-shadow hover:shadow-md">
                    <Icon className="h-5 w-5 text-landing-teal" aria-hidden />
                    <h3 className="mt-4 font-semibold text-landing-navy">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-landing-muted">{f.body}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. AI safety */}
      <section id="ai-safety" className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <FadeIn>
          <div className="flex items-start gap-3">
            <Shield className="mt-1 h-6 w-6 shrink-0 text-landing-teal" aria-hidden />
            <SectionHeading
              title="Helpful intelligence, always under human care."
              subtitle="AI drafts only. Providers review clinical content. EyeQ is not a diagnosis. Live PHI stays blocked until readiness gates and BAAs pass."
            />
          </div>
        </FadeIn>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'Drafts only',
              body: 'AI suggestions stay drafts until a licensed provider reviews and accepts them.',
            },
            {
              title: 'Provider review required',
              body: 'Nothing clinical reaches patients without provider-approved workflows.',
            },
            {
              title: 'Not a diagnosis',
              body: 'Imaging analysis supports review — it never replaces clinical judgment.',
            },
            {
              title: 'PHI readiness & BAAs',
              body: 'Production PHI is fail-closed until MFA, RLS, vendor BAAs, and readiness checks pass.',
            },
          ].map((p, i) => (
            <FadeIn key={p.title} delay={i * 70} blur>
              <div className="h-full rounded-2xl border border-landing-border/80 bg-white p-6 shadow-sm">
                <Sparkles className="h-5 w-5 text-landing-teal" aria-hidden />
                <h3 className="mt-4 font-semibold text-landing-navy">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-landing-muted">{p.body}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* 6. Demo CTA */}
      <section id="demo" className="border-y border-landing-border/60 bg-white/60 py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <FadeIn>
            <div className="rounded-3xl border border-landing-teal/30 bg-landing-teal/5 px-8 py-12 sm:px-12">
              <p className="text-sm font-semibold uppercase tracking-wider text-landing-teal">
                Explore Live Demo
              </p>
              <h2 className="landing-display mt-3 text-3xl font-semibold text-landing-navy sm:text-4xl">
                Walk the product as owner, provider, staff, or patient.
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-landing-muted">
                Free synthetic practice — no payment, no live PHI. Pitch-ready paths for owners,
                providers, front desk, technicians, and patients.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={liveDemoHref}
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'bg-landing-teal text-white hover:bg-landing-teal/90',
                  )}
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Open Live Demo
                </Link>
                <Link
                  href="/contact"
                  className={cn(
                    buttonVariants({ size: 'lg', variant: 'outline' }),
                    'border-landing-border bg-white',
                  )}
                >
                  Schedule a guided demo
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Pathways */}
      <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <FadeIn>
            <PathwayCard
              title="For Eye Care Practices"
              links={[
                { href: liveDemoHref, label: 'Live Demo (free)' },
                { href: '/pricing', label: 'Pricing & plans' },
                { href: '/signup/practice', label: 'Start a practice' },
                { href: '/contact', label: 'Request an introduction' },
              ]}
            />
          </FadeIn>
          <FadeIn delay={80}>
            <PathwayCard
              title="For Patients"
              links={[
                { href: '/login?next=/portal', label: 'Enter Patient Portal' },
                { href: '/login?next=/portal/appointments', label: 'Schedule an appointment' },
                { href: '#for-patients', label: 'How the portal helps' },
              ]}
            />
          </FadeIn>
        </div>
      </section>

      {/* For patients brief */}
      <section id="for-patients" className="bg-landing-sand/20 py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <FadeIn>
            <SectionHeading
              title="Your eye care should feel clear, not complicated."
              subtitle="Patients never pay for EyeQ. Your practice sponsors the subscription; the portal stays free for patients."
            />
          </FadeIn>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Calendar, text: 'Upcoming appointments and online scheduling' },
              { icon: FileText, text: 'Glasses and contact lens prescriptions' },
              { icon: CheckCircle2, text: 'Provider-approved visit summaries' },
              { icon: Camera, text: 'Approved imaging explanations from your provider' },
              { icon: MessageCircle, text: 'Secure messages with your practice' },
              { icon: Users, text: 'Family account support where enabled' },
            ].map(({ icon: Icon, text }, i) => (
              <FadeIn key={text} delay={i * 40}>
                <div className="flex items-start gap-3 rounded-xl border border-landing-border/70 bg-white p-4 text-sm text-landing-muted">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-landing-teal" aria-hidden />
                  {text}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Pricing preview */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <FadeIn>
          <SectionHeading
            title="Plans for practices — patients never pay."
            subtitle="Pilot, Practice, Growth, and Enterprise. Display prices are informational; Checkout uses your Stripe Price IDs when configured. No fake claims."
          />
        </FadeIn>
        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SAAS_PLAN_ORDER.map((id, i) => {
            const plan = SAAS_PLANS[id];
            return (
              <FadeIn key={id} delay={i * 70} blur>
                <div
                  className={cn(
                    'flex h-full flex-col rounded-2xl border bg-white p-6 shadow-sm',
                    plan.highlighted
                      ? 'border-landing-teal/50 ring-1 ring-landing-teal/20'
                      : 'border-landing-border/80',
                  )}
                >
                  <p className="text-sm font-medium text-landing-teal">{plan.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-landing-navy">
                    {formatPlanPrice(plan)}
                  </p>
                  <p className="mt-2 text-sm text-landing-muted">{plan.blurb}</p>
                  <ul className="mt-5 flex-1 space-y-2">
                    {plan.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex gap-2 text-xs text-landing-muted">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-landing-teal" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={
                      plan.cta === 'contact' || plan.cta === 'pilot'
                        ? '/contact'
                        : `/signup/practice?plan=${id}`
                    }
                    className={cn(
                      buttonVariants({ size: 'sm' }),
                      'mt-6 w-full',
                      plan.highlighted
                        ? 'bg-landing-teal text-white hover:bg-landing-teal/90'
                        : 'border border-landing-border bg-white text-landing-navy',
                    )}
                  >
                    {plan.cta === 'checkout' ? 'Get started' : 'Talk with EyeQ'}
                  </Link>
                </div>
              </FadeIn>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm text-landing-muted">
          <Link href="/pricing" className="font-medium text-landing-teal hover:underline">
            Full pricing details
          </Link>
          {' · '}
          Live Demo remains free with no subscription.
        </p>
      </section>

      {/* Trust */}
      <section id="trust" className="border-t border-landing-border/60 bg-white/50 py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <FadeIn>
            <SectionHeading
              title="Built with care, responsibility, and trust."
              subtitle="Each production deployment requires appropriate configuration, agreements, policies, and review."
            />
          </FadeIn>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              'Role-based access',
              'Provider review and sign-off',
              'Secure patient communication',
              'Audit-ready workflows',
              'Private imaging access',
              'Organization and location separation',
              'Transparent AI limitations',
              'No sale of patient data',
            ].map((item, i) => (
              <FadeIn key={item} delay={i * 40}>
                <div className="flex items-center gap-2 text-sm text-landing-muted">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-landing-teal" aria-hidden />
                  {item}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <FadeIn>
          <div className="rounded-3xl border border-landing-border/80 bg-gradient-to-br from-landing-navy to-[#3d5266] px-8 py-14 text-center text-white shadow-xl sm:px-12">
            <h2 className="landing-display text-3xl font-semibold sm:text-4xl">
              Come build a more connected future for eye care.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/85">
              Explore the free Live Demo, schedule a walkthrough, or start a practice membership when
              you are ready.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={liveDemoHref}
                className={cn(buttonVariants({ size: 'lg' }), 'bg-white text-landing-navy hover:bg-white/90')}
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Live Demo
              </Link>
              <Link
                href="/signup/practice"
                className={cn(
                  buttonVariants({ size: 'lg', variant: 'outline' }),
                  'border-white/40 bg-transparent text-white hover:bg-white/10',
                )}
              >
                Start a practice
              </Link>
              <Link
                href="/contact"
                className={cn(buttonVariants({ size: 'lg', variant: 'ghost' }), 'text-white hover:bg-white/10')}
              >
                Talk With Our Team
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      <footer className="border-t border-landing-border/60 bg-landing-bg py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 text-sm text-landing-muted sm:flex-row lg:px-8">
          <p>© {new Date().getFullYear()} EyeQ AI. Imaging review support only, not a diagnosis.</p>
          <nav className="flex flex-wrap justify-center gap-4" aria-label="Footer">
            <Link href={liveDemoHref} className="hover:text-landing-navy">
              Live Demo
            </Link>
            <Link href="/pricing" className="hover:text-landing-navy">
              Pricing
            </Link>
            <Link href="/login" className="hover:text-landing-navy">
              Practice Sign In
            </Link>
            <Link href="/login?next=/portal" className="hover:text-landing-navy">
              Patient Portal
            </Link>
            <Link href="/contact" className="hover:text-landing-navy">
              Contact
            </Link>
            <Link href="/signup/practice" className="hover:text-landing-navy">
              Start a practice
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="max-w-3xl">
      <h2 className="landing-display text-3xl font-semibold tracking-tight text-landing-navy sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-lg leading-relaxed text-landing-muted">{subtitle}</p>
    </div>
  );
}

function PathwayCard({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div className="rounded-2xl border border-landing-border/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="font-semibold text-landing-navy">{title}</h3>
      <ul className="mt-4 space-y-2">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              className="group flex items-center gap-2 text-sm text-landing-teal hover:text-landing-navy"
            >
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
