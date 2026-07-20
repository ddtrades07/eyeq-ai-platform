'use client';

import * as React from 'react';
import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { submitContactIntro, type ContactFormState } from '@/server/actions/contact';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="bg-landing-navy hover:bg-landing-navy/90">
      {pending ? 'Sending…' : 'Send message'}
    </Button>
  );
}

export function ContactForm() {
  const [state, action] = useFormState<ContactFormState | null, FormData>(submitContactIntro, null);

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required autoComplete="name" className="border-landing-border" />
          {state?.ok === false && state.fieldErrors?.name ? (
            <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" className="border-landing-border" />
          {state?.ok === false && state.fieldErrors?.email ? (
            <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">I am reaching out as</Label>
        <select
          id="role"
          name="role"
          required
          className="flex h-10 w-full rounded-md border border-landing-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-teal focus-visible:ring-offset-2"
          defaultValue="practice"
        >
          <option value="practice">Eye care practice / professional</option>
          <option value="patient">Patient</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">How can we help?</Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="Tell us about your practice, location count, or what you’re hoping EyeQ can help with…"
          className="border-landing-border"
        />
        {state?.ok === false && state.fieldErrors?.message ? (
          <p className="text-xs text-destructive">{state.fieldErrors.message[0]}</p>
        ) : null}
      </div>
      {state?.ok === false && !state.fieldErrors ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p className="rounded-lg border border-landing-teal/30 bg-landing-teal/5 p-4 text-sm text-landing-navy" role="status">
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

export function ContactPageShell() {
  return (
    <div className="landing-page min-h-screen bg-landing-bg text-landing-navy">
      <div className="mx-auto max-w-xl px-5 py-12 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-landing-muted hover:text-landing-navy"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to EyeQ AI
        </Link>
        <h1 className="landing-display mt-8 text-3xl font-semibold">Talk with our team</h1>
        <p className="mt-3 text-landing-muted">
          Request an introduction, ask a question, or share how your practice cares for patients.
          We&apos;ll respond when introduction requests are being scheduled.
        </p>
        <p className="mt-2 text-sm text-landing-muted">
          For medical questions, please contact your eye care provider directly.
        </p>
        <div className="mt-10 rounded-2xl border border-landing-border/80 bg-white p-6 shadow-sm">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
