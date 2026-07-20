'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Camera,
  CheckCircle2,
  FileText,
  Heart,
  MessageCircle,
  Shield,
  Sparkles,
  Stethoscope,
  Users,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LandingNav } from './landing-nav';
import { ConnectionVisual } from './connection-visual';
import { FadeIn } from './fade-in';

export function LandingPageContent({ liveDemoHref = '/demo' }: { liveDemoHref?: string }) {
  return (
    <div className="landing-page min-h-screen bg-landing-bg text-landing-navy">
      <LandingNav liveDemoHref={liveDemoHref} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(91,138,138,0.12),transparent)]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
          <FadeIn>
            <p className="text-sm font-medium text-landing-teal">A connected home for modern eye care</p>
            <h1 className="landing-display mt-4 text-4xl font-semibold leading-[1.15] tracking-tight text-landing-navy sm:text-5xl lg:text-[3.25rem]">
              Eye care feels better when everything is connected.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-landing-muted">
              EyeQ brings your care team, appointments, prescriptions, imaging, communication, and
              follow-up into one thoughtful home built around better eye care.
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
                href="#for-practices"
                className={cn(
                  buttonVariants({ size: 'lg', variant: 'outline' }),
                  'border-landing-border bg-white/80 text-landing-navy',
                )}
              >
                I&apos;m an Eye Care Professional
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="#for-patients"
                className={cn(
                  buttonVariants({ size: 'lg', variant: 'outline' }),
                  'border-landing-border bg-white/80 text-landing-navy hover:bg-landing-sand/30',
                )}
              >
                I&apos;m a Patient
              </Link>
            </div>
            <p className="mt-6 text-sm text-landing-muted">
              Built for optometry today. Designed to grow with the future of eye care.
            </p>
          </FadeIn>
          <FadeIn delay={120} className="relative">
            <div className="rounded-2xl border border-landing-border/80 bg-white/70 p-4 shadow-lg shadow-landing-navy/5 backdrop-blur-sm">
              <ConnectionVisual className="mx-auto h-auto w-full max-w-md" />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Pathways */}
      <section className="border-y border-landing-border/60 bg-white/50 py-12">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 lg:grid-cols-2 lg:px-8">
          <PathwayCard
            title="For Eye Care Practices"
            links={[
              { href: liveDemoHref, label: 'Live Demo' },
              { href: '#for-practices', label: 'Explore EyeQ' },
              { href: '/login', label: 'Practice sign in' },
              { href: '/contact', label: 'Request an introduction' },
            ]}
          />
          <PathwayCard
            title="For Patients"
            links={[
              { href: '/login?next=/portal', label: 'Enter Patient Portal' },
              { href: '/login?next=/portal/appointments', label: 'Schedule an appointment' },
              { href: '#for-patients', label: 'Access prescriptions and care information' },
            ]}
          />
        </div>
      </section>

      {/* Welcome */}
      <section id="how-eyeq-helps" className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <FadeIn>
          <SectionHeading
            title="One place for the people behind eye care."
            subtitle="For practices, EyeQ helps teams stay prepared, communicate clearly, and keep every patient connected to their care. For patients, EyeQ creates an easier way to understand visits, access prescriptions, schedule appointments, and follow the guidance of their eye care provider."
          />
        </FadeIn>
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <FadeIn delay={80}>
            <AudienceCard
              icon={Stethoscope}
              title="A calmer day for your practice."
              items={[
                'See what needs attention',
                'Prepare for each patient',
                'Document visits more naturally',
                'Review imaging in one place',
                'Keep follow-up from being forgotten',
                'Give every team member the right view',
              ]}
              accent="teal"
            />
          </FadeIn>
          <FadeIn delay={160}>
            <AudienceCard
              icon={Heart}
              title="Your eye care, easier to understand."
              items={[
                'Schedule and manage appointments',
                'Access glasses and contact lens prescriptions',
                'Review provider-approved visit summaries',
                'Receive reminders and care instructions',
                'Message the practice',
                'Keep family eye care organized',
              ]}
              accent="sand"
            />
          </FadeIn>
        </div>
      </section>

      {/* Journey */}
      <section className="bg-landing-sand/25 py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <FadeIn>
            <SectionHeading
              title="From appointment to follow-up, EyeQ keeps care connected."
              subtitle="Care is a relationship over time, not a single visit. EyeQ is designed to support that continuity."
            />
          </FadeIn>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <JourneyStep
              step="1"
              title="Before the visit"
              items={['Scheduling', 'Digital forms', 'Reminders', 'Pre-visit preparation']}
            />
            <JourneyStep
              step="2"
              title="During the visit"
              items={[
                'Patient history at hand',
                'Documentation support',
                'Imaging organization',
                'Care team coordination',
              ]}
            />
            <JourneyStep
              step="3"
              title="After the visit"
              items={[
                'Provider-approved summary',
                'Prescriptions',
                'Education',
                'Follow-up reminders',
                'Secure communication',
              ]}
            />
          </div>
        </div>
      </section>

      {/* AI */}
      <section id="our-approach" className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <FadeIn>
          <SectionHeading
            title="Helpful intelligence, always under human care."
            subtitle="EyeQ uses AI to help organize information, reduce repetitive work, and bring important details forward. Clinical decisions remain with the eye care provider, and patient-facing information is shared only through provider-approved workflows."
          />
        </FadeIn>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Human judgment comes first', body: 'Providers remain responsible for every clinical decision.' },
            { title: 'Important information stays connected', body: 'Context travels with the patient across visits and team members.' },
            { title: 'AI explains why something was brought forward', body: 'Review support includes transparency about what was considered.' },
            { title: 'Providers review clinical content before it is finalized', body: 'Nothing clinical reaches patients without provider approval.' },
          ].map((p) => (
            <FadeIn key={p.title}>
              <div className="h-full rounded-2xl border border-landing-border/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <Sparkles className="h-5 w-5 text-landing-teal" aria-hidden />
                <h3 className="mt-4 font-semibold text-landing-navy">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-landing-muted">{p.body}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* For optometrists */}
      <section id="for-practices" className="border-t border-landing-border/60 bg-white/60 py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <FadeIn>
            <SectionHeading
              title="More time for the part of care that matters most."
              subtitle="EyeQ helps reduce the time spent searching through disconnected systems, repeating documentation, and tracking unfinished follow-up so the care team can focus more fully on the person in front of them."
            />
          </FadeIn>
          <FadeIn delay={60}>
            <div
              id="demo"
              className="mt-8 flex flex-col items-start gap-4 rounded-2xl border border-landing-teal/30 bg-landing-teal/5 p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-landing-navy">Pitch-ready demo</p>
                <p className="mt-1 max-w-xl text-sm text-landing-muted">
                  Walk through a sample practice with glaucoma timelines, diabetic exams, dry eye
                  continuity, recalls, and imaging — synthetic data only, no live PHI.
                </p>
              </div>
              <Link
                href={liveDemoHref}
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'shrink-0 bg-landing-teal text-white hover:bg-landing-teal/90',
                )}
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Live Demo
              </Link>
            </div>
          </FadeIn>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Capability label="Practice Brain" description="See what your day needs at a glance." />
            <Capability label="Appointment preparation" description="Know what each visit may need before the patient arrives." />
            <Capability label="Patient timeline" description="Keep history, imaging, and notes connected over time." />
            <Capability label="Ambient documentation support" description="Capture visits with provider review built in." />
            <Capability label="Imaging organization" description="Organize imaging and bring possible areas for provider review forward." />
            <Capability label="Follow-up connection" description="Help patients stay connected to recommended follow-up." />
            <Capability label="Team workflows" description="Give each role the view they need, nothing more." />
            <Capability label="Connected EHR options" description="Work alongside the systems you already use." />
          </div>
        </div>
      </section>

      {/* For patients */}
      <section id="for-patients" className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <FadeIn>
          <SectionHeading
            title="Your eye care should feel clear, not complicated."
            subtitle="An EyeQ-connected practice can give you one secure place to manage appointments, view prescriptions, read provider-approved visit information, receive reminders, and stay connected with your care team."
          />
        </FadeIn>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Calendar, text: 'Upcoming appointments and online scheduling' },
            { icon: FileText, text: 'Glasses and contact lens prescriptions with expiration dates' },
            { icon: CheckCircle2, text: 'Provider-approved visit summaries' },
            { icon: Camera, text: 'Approved imaging explanations from your provider' },
            { icon: MessageCircle, text: 'Secure messages with your practice' },
            { icon: Users, text: 'Family account support where enabled' },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-start gap-3 rounded-xl border border-landing-border/70 bg-white p-4 text-sm text-landing-muted"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-landing-teal" aria-hidden />
              {text}
            </div>
          ))}
        </div>
        <p className="mt-8 rounded-xl border border-landing-border/70 bg-landing-sand/20 px-5 py-4 text-sm leading-relaxed text-landing-muted">
          <strong className="font-medium text-landing-navy">EyeQ does not replace your eye care provider.</strong>{' '}
          Medical questions and care decisions remain between you and your provider.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login?next=/portal" className={cn(buttonVariants(), 'bg-landing-teal text-white hover:bg-landing-teal/90')}>
            Enter Patient Portal
          </Link>
          <Link href="/login?next=/portal/appointments" className={cn(buttonVariants({ variant: 'outline' }), 'border-landing-border')}>
            Schedule an appointment
          </Link>
        </div>
      </section>

      {/* Customizable */}
      <section className="bg-landing-sand/20 py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <FadeIn>
            <SectionHeading
              title="Designed around the way your practice cares."
              subtitle="No two practices care for patients in exactly the same way. EyeQ can be configured around your team, locations, appointment flow, clinical focus, and existing EHR."
            />
          </FadeIn>
          <ul className="mt-10 flex flex-wrap gap-2">
            {[
              'Private optometry',
              'Retail optometry',
              'Specialty contact lens',
              'Dry eye clinics',
              'Pediatric optometry',
              'Hospital & academic clinics',
              'OD/MD integrated practices',
              'Multi-location groups',
            ].map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-landing-border/80 bg-white px-4 py-2 text-sm text-landing-muted"
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <FadeIn>
          <div className="flex items-start gap-3">
            <Shield className="mt-1 h-6 w-6 shrink-0 text-landing-teal" aria-hidden />
            <SectionHeading
              title="Built with care, responsibility, and trust."
              subtitle="EyeQ is being designed for healthcare privacy and security requirements. Each production deployment requires appropriate configuration, agreements, policies, and review."
            />
          </div>
        </FadeIn>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            'Role-based access',
            'Provider review and sign-off',
            'Secure patient communication',
            'Audit-ready workflows',
            'Private imaging access',
            'Organization and location separation',
            'Transparent AI limitations',
            'No sale of patient data',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-landing-muted">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-landing-teal" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Community, no fake testimonials */}
      <section className="border-t border-landing-border/60 bg-white/50 py-20">
        <div className="mx-auto max-w-3xl px-5 text-center lg:px-8">
          <FadeIn>
            <h2 className="landing-display text-2xl font-semibold text-landing-navy sm:text-3xl">
              Built alongside the eye care community.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-landing-muted">
              EyeQ is shaped by conversations with optometrists, technicians, practice teams, and
              patients. The goal is not to force practices into a rigid system, but to build a better
              home around the way eye care is actually delivered.
            </p>
            <p className="mt-6 text-sm italic text-landing-muted/80">
              Design partner practices, coming soon. Verified stories will appear here when available.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Final invitation */}
      <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <FadeIn>
          <div className="rounded-3xl border border-landing-border/80 bg-gradient-to-br from-landing-navy to-[#3d5266] px-8 py-14 text-center text-white shadow-xl sm:px-12">
            <h2 className="landing-display text-3xl font-semibold sm:text-4xl">
              Come build a more connected future for eye care.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/85">
              Whether you care for patients, support a practice, or are managing your own eye health,
              EyeQ is being built to make every step feel more connected.
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
                href="#for-practices"
                className={cn(
                  buttonVariants({ size: 'lg', variant: 'outline' }),
                  'border-white/40 bg-transparent text-white hover:bg-white/10',
                )}
              >
                Explore EyeQ for Practices
              </Link>
              <Link href="/contact" className={cn(buttonVariants({ size: 'lg', variant: 'ghost' }), 'text-white hover:bg-white/10')}>
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
            <Link href="/login" className="hover:text-landing-navy">
              Practice Sign In
            </Link>
            <Link href="/login?next=/portal" className="hover:text-landing-navy">
              Patient Portal
            </Link>
            <Link href="/contact" className="hover:text-landing-navy">
              Contact
            </Link>
            <Link href="/signup" className="hover:text-landing-navy">
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
      <h2 className="landing-display text-3xl font-semibold tracking-tight text-landing-navy sm:text-4xl">{title}</h2>
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
          <li key={link.href}>
            <Link href={link.href} className="group flex items-center gap-2 text-sm text-landing-teal hover:text-landing-navy">
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AudienceCard({
  icon: Icon,
  title,
  items,
  accent,
}: {
  icon: typeof Heart;
  title: string;
  items: string[];
  accent: 'teal' | 'sand';
}) {
  return (
    <div className="h-full rounded-2xl border border-landing-border/80 bg-white p-8 shadow-sm">
      <div
        className={cn(
          'inline-flex h-11 w-11 items-center justify-center rounded-xl',
          accent === 'teal' ? 'bg-landing-teal/10 text-landing-teal' : 'bg-landing-sand/50 text-landing-navy',
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-landing-navy">{title}</h3>
      <ul className="mt-5 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-landing-muted">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-landing-teal" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function JourneyStep({ step, title, items }: { step: string; title: string; items: string[] }) {
  return (
    <FadeIn>
      <div className="relative rounded-2xl border border-landing-border/70 bg-white p-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-landing-teal">Step {step}</span>
        <h3 className="mt-2 text-lg font-semibold text-landing-navy">{title}</h3>
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item} className="text-sm text-landing-muted">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </FadeIn>
  );
}

function Capability({ label, description }: { label: string; description: string }) {
  return (
    <div className="rounded-xl border border-landing-border/60 bg-white/80 p-5 transition-shadow hover:shadow-sm">
      <p className="font-medium text-landing-navy">{label}</p>
      <p className="mt-1 text-sm text-landing-muted">{description}</p>
    </div>
  );
}
