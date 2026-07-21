'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Building2,
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
  UserRound,
  Users,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollReveal } from '@/components/marketing/ScrollReveal';
import { LandingNav } from './landing-nav';
import { ConnectionVisual } from './connection-visual';
import { GlassLensBg } from './glass-lens-bg';
import { StickyPanel } from './sticky-panel';

const FEATURE_CARDS = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    body: 'See what needs attention across the day: visits, follow-ups, and team tasks.',
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
    body: 'Draft findings for provider review only: never a diagnosis, never auto-released.',
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
    body: 'Draft claims and statements with human review, not silent submission.',
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

const USER_PATHS = [
  {
    icon: UserRound,
    title: 'Patient Portal',
    body: 'View appointments, prescriptions, and provider-approved information from your practice.',
    href: '/login?next=/portal',
    cta: 'Patient Login',
  },
  {
    icon: Stethoscope,
    title: 'Provider or Staff',
    body: 'Sign in to clinical workflows, scheduling, charting, and day-of practice tools.',
    href: '/login',
    cta: 'Staff Login',
  },
  {
    icon: Building2,
    title: 'Practice Owner',
    body: 'Set up your organization, choose membership during onboarding, and invite your team.',
    href: '/signup/practice',
    cta: 'Start Practice Setup',
  },
  {
    icon: Sparkles,
    title: 'Explore Demo',
    body: 'Walk a synthetic practice as owner, provider, staff, or patient. No payment required.',
    href: '/demo',
    cta: 'Live Demo',
  },
] as const;

const PRACTICE_CAPABILITIES = [
  'Connected scheduling, charting, imaging, and patient communication',
  'Role-aware tools for owners, providers, technicians, and front desk',
  'AI drafts that stay under provider review (not a diagnosis)',
  'PHI readiness gates and BAAs before live clinical data',
  'Patient portal access sponsored by the practice (patients never pay)',
  'Membership and billing configured during practice-owner onboarding',
] as const;

export function LandingPageContent({ liveDemoHref = '/demo' }: { liveDemoHref?: string }) {
  const paths = USER_PATHS.map((p) =>
    p.title === 'Explore Demo' ? { ...p, href: liveDemoHref } : p,
  );

  return (
    <div className="landing-page min-h-screen bg-landing-bg text-landing-navy">
      <LandingNav liveDemoHref={liveDemoHref} />

      {/* 1. Hero */}
      <section className="relative overflow-hidden">
        <GlassLensBg />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
          <div>
            <ScrollReveal animateOnMount blur>
              <p className="text-sm font-medium text-landing-teal">A connected home for modern eye care</p>
            </ScrollReveal>
            <ScrollReveal animateOnMount delay={90}>
              <h1 className="landing-display mt-4 text-4xl font-semibold leading-[1.15] tracking-tight text-landing-navy sm:text-5xl lg:text-[3.25rem]">
                Eye care feels better when everything is connected.
              </h1>
            </ScrollReveal>
            <ScrollReveal animateOnMount delay={180}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-landing-muted">
                EyeQ brings your care team, appointments, charting, imaging, communication, and
                follow-up into one thoughtful platform, with AI that drafts, and providers who decide.
              </p>
            </ScrollReveal>
            <ScrollReveal animateOnMount delay={270}>
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
                  Request Practice Demo
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/signup/practice"
                  className={cn(
                    buttonVariants({ size: 'lg', variant: 'ghost' }),
                    'text-landing-navy',
                  )}
                >
                  Start Practice Setup
                </Link>
              </div>
              <p className="mt-6 text-sm text-landing-muted">
                Live Demo is free: synthetic data only, no payment required. Patients never pay for
                EyeQ access.
              </p>
            </ScrollReveal>
          </div>
          <ScrollReveal animateOnMount delay={200} className="relative">
            <div className="rounded-2xl border border-landing-border/80 bg-white/70 p-4 shadow-lg shadow-landing-navy/5 backdrop-blur-sm">
              <ConnectionVisual className="mx-auto h-auto w-full max-w-md" />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Choose how you use EyeQ */}
      <section id="get-started" className="border-y border-landing-border/60 bg-white/60 py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <ScrollReveal>
            <SectionHeading
              title="Choose how you use EyeQ"
              subtitle="Patients, care teams, and practice owners each have a clear path. Patients never pay."
            />
          </ScrollReveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {paths.map((path, i) => {
              const Icon = path.icon;
              return (
                <ScrollReveal key={path.title} delay={i * 80} blur>
                  <div className="flex h-full flex-col rounded-2xl border border-landing-border/80 bg-white p-6 shadow-sm">
                    <Icon className="h-5 w-5 text-landing-teal" aria-hidden />
                    <h3 className="mt-4 font-semibold text-landing-navy">{path.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-landing-muted">{path.body}</p>
                    <Link
                      href={path.href}
                      className={cn(
                        buttonVariants({ size: 'sm' }),
                        'mt-6 w-full bg-landing-navy text-white hover:bg-landing-navy/90',
                      )}
                    >
                      {path.cta}
                    </Link>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. Problem */}
      <section id="problem" className="bg-white/50 py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <ScrollReveal>
            <SectionHeading
              title="Practices are running on too many disconnected pieces."
              subtitle="Outdated systems, scattered tools, slow flow, weak ops visibility, and manual work add friction to every visit."
            />
          </ScrollReveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PROBLEMS.map((p, i) => (
              <ScrollReveal key={p.title} delay={i * 60} blur>
                <div className="h-full rounded-2xl border border-landing-border/80 bg-white p-5 shadow-sm">
                  <h3 className="font-semibold text-landing-navy">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-landing-muted">{p.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Solution */}
      <section id="solution" className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
          <StickyPanel>
            <ScrollReveal>
              <SectionHeading
                title="One connected platform for the whole practice."
                subtitle="EyeQ links clinical care, operations, and patient experience without forcing a rigid workflow."
              />
            </ScrollReveal>
          </StickyPanel>
          <ul className="space-y-3">
            {SOLUTIONS.map((item, i) => (
              <ScrollReveal key={item} delay={i * 50}>
                <li className="flex items-start gap-3 rounded-xl border border-landing-border/70 bg-white/80 px-4 py-3 text-sm text-landing-muted">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-landing-teal" aria-hidden />
                  {item}
                </li>
              </ScrollReveal>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. Feature cards */}
      <section id="features" className="bg-landing-sand/25 py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <ScrollReveal>
            <SectionHeading
              title="Built for the real day in clinic."
              subtitle="From the front desk to the chair to follow-up, every module stays in the same home."
            />
          </ScrollReveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_CARDS.map((f, i) => {
              const Icon = f.icon;
              return (
                <ScrollReveal key={f.title} delay={(i % 6) * 70} blur>
                  <div className="h-full rounded-2xl border border-landing-border/80 bg-white/90 p-6 shadow-sm transition-shadow hover:shadow-md">
                    <Icon className="h-5 w-5 text-landing-teal" aria-hidden />
                    <h3 className="mt-4 font-semibold text-landing-navy">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-landing-muted">{f.body}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. AI safety */}
      <section id="ai-safety" className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <ScrollReveal>
          <div className="flex items-start gap-3">
            <Shield className="mt-1 h-6 w-6 shrink-0 text-landing-teal" aria-hidden />
            <SectionHeading
              title="Helpful intelligence, always under human care."
              subtitle="AI drafts only. Providers review clinical content. EyeQ is not a diagnosis. Live PHI stays blocked until readiness gates and BAAs pass."
            />
          </div>
        </ScrollReveal>
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
              body: 'Imaging analysis supports review; it never replaces clinical judgment.',
            },
            {
              title: 'PHI readiness & BAAs',
              body: 'Production PHI is fail-closed until MFA, RLS, vendor BAAs, and readiness checks pass.',
            },
          ].map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 70} blur>
              <div className="h-full rounded-2xl border border-landing-border/80 bg-white p-6 shadow-sm">
                <Sparkles className="h-5 w-5 text-landing-teal" aria-hidden />
                <h3 className="mt-4 font-semibold text-landing-navy">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-landing-muted">{p.body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Built for Modern Optometry Practices (replaces public pricing) */}
      <section id="for-practices" className="border-y border-landing-border/60 bg-white/60 py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <ScrollReveal>
            <SectionHeading
              title="Built for Modern Optometry Practices"
              subtitle="EyeQ is a connected platform for clinical care, operations, and patient experience. Membership and pricing are available during practice-owner onboarding. Patients do not pay for EyeQ access."
            />
          </ScrollReveal>
          <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
            <ul className="space-y-3">
              {PRACTICE_CAPABILITIES.map((item, i) => (
                <ScrollReveal key={item} delay={i * 50}>
                  <li className="flex items-start gap-3 rounded-xl border border-landing-border/70 bg-white px-4 py-3 text-sm text-landing-muted">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-landing-teal" aria-hidden />
                    {item}
                  </li>
                </ScrollReveal>
              ))}
            </ul>
            <ScrollReveal delay={120} blur>
              <div className="rounded-2xl border border-landing-teal/30 bg-landing-teal/5 p-8">
                <p className="text-sm font-semibold uppercase tracking-wider text-landing-teal">
                  For practice owners
                </p>
                <p className="mt-3 text-sm leading-relaxed text-landing-muted">
                  Request a walkthrough, start practice setup, or explore the free Live Demo. Plan
                  selection and Stripe Checkout happen in the owner flow after signup, not on this
                  public homepage.
                </p>
                <div className="mt-8 flex flex-col gap-3">
                  <Link
                    href="/contact"
                    className={cn(
                      buttonVariants({ size: 'lg' }),
                      'w-full bg-landing-navy text-white hover:bg-landing-navy/90',
                    )}
                  >
                    Request Practice Demo
                  </Link>
                  <Link
                    href="/signup/practice"
                    className={cn(
                      buttonVariants({ size: 'lg', variant: 'outline' }),
                      'w-full border-landing-border bg-white text-landing-navy',
                    )}
                  >
                    Start Practice Setup
                  </Link>
                  <Link
                    href={liveDemoHref}
                    className={cn(
                      buttonVariants({ size: 'lg' }),
                      'w-full bg-landing-teal text-white hover:bg-landing-teal/90',
                    )}
                  >
                    <Sparkles className="h-4 w-4" aria-hidden />
                    View Live Demo
                  </Link>
                </div>
                <p className="mt-6 text-xs text-landing-muted">
                  Looking for membership details? See{' '}
                  <Link href="/pricing" className="font-medium text-landing-teal hover:underline">
                    Membership
                  </Link>{' '}
                  (practice owners only).
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* 6. Demo CTA */}
      <section id="demo" className="bg-landing-sand/20 py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <ScrollReveal>
            <div className="rounded-3xl border border-landing-teal/30 bg-landing-teal/5 px-8 py-12 sm:px-12">
              <p className="text-sm font-semibold uppercase tracking-wider text-landing-teal">
                Explore Live Demo
              </p>
              <h2 className="landing-display mt-3 text-3xl font-semibold text-landing-navy sm:text-4xl">
                Walk the product as owner, provider, staff, or patient.
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-landing-muted">
                Free synthetic practice: no payment, no live PHI. Pitch-ready paths for owners,
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
          </ScrollReveal>
        </div>
      </section>

      {/* For patients brief */}
      <section id="for-patients" className="py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <ScrollReveal>
            <SectionHeading
              title="Your eye care should feel clear, not complicated."
              subtitle="Patients never pay for EyeQ. Your practice sponsors the subscription; the portal stays free for patients."
            />
          </ScrollReveal>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Calendar, text: 'Upcoming appointments and online scheduling' },
              { icon: FileText, text: 'Glasses and contact lens prescriptions' },
              { icon: CheckCircle2, text: 'Provider-approved visit summaries' },
              { icon: Camera, text: 'Approved imaging explanations from your provider' },
              { icon: MessageCircle, text: 'Secure messages with your practice' },
              { icon: Users, text: 'Family account support where enabled' },
            ].map(({ icon: Icon, text }, i) => (
              <ScrollReveal key={text} delay={i * 40}>
                <div className="flex items-start gap-3 rounded-xl border border-landing-border/70 bg-white p-4 text-sm text-landing-muted">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-landing-teal" aria-hidden />
                  {text}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="border-t border-landing-border/60 bg-white/50 py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <ScrollReveal>
            <SectionHeading
              title="Built with care, responsibility, and trust."
              subtitle="Each production deployment requires appropriate configuration, agreements, policies, and review."
            />
          </ScrollReveal>
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
              <ScrollReveal key={item} delay={i * 40}>
                <div className="flex items-center gap-2 text-sm text-landing-muted">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-landing-teal" aria-hidden />
                  {item}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <ScrollReveal>
          <div className="rounded-3xl border border-landing-border/80 bg-gradient-to-br from-landing-navy to-[#3d5266] px-8 py-14 text-center text-white shadow-xl sm:px-12">
            <h2 className="landing-display text-3xl font-semibold sm:text-4xl">
              Come build a more connected future for eye care.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/85">
              Explore the free Live Demo, request a practice demo, or start practice setup when you
              are ready. Patients never pay.
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
                Start Practice Setup
              </Link>
              <Link
                href="/contact"
                className={cn(buttonVariants({ size: 'lg', variant: 'ghost' }), 'text-white hover:bg-white/10')}
              >
                Request Practice Demo
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <footer className="border-t border-landing-border/60 bg-landing-bg py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 text-sm text-landing-muted sm:flex-row lg:px-8">
          <p>© {new Date().getFullYear()} EyeQ AI. Imaging review support only, not a diagnosis.</p>
          <nav className="flex flex-wrap justify-center gap-4" aria-label="Footer">
            <Link href={liveDemoHref} className="hover:text-landing-navy">
              Live Demo
            </Link>
            <Link href="#for-practices" className="hover:text-landing-navy">
              For Practices
            </Link>
            <Link href="/pricing" className="hover:text-landing-navy">
              Membership
            </Link>
            <Link href="/login" className="hover:text-landing-navy">
              Staff Login
            </Link>
            <Link href="/login?next=/portal" className="hover:text-landing-navy">
              Patient Login
            </Link>
            <Link href="/contact" className="hover:text-landing-navy">
              Contact
            </Link>
            <Link href="/signup/practice" className="hover:text-landing-navy">
              Start Practice Setup
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
