import type { Metadata } from 'next';
import { ContactPageShell } from '@/components/landing/contact-form';
import { publicEnv } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Talk With Our Team',
  description: 'Request an introduction to EyeQ AI or ask a question about connected eye care for your practice.',
};

export default function ContactPage() {
  return <ContactPageShell />;
}
