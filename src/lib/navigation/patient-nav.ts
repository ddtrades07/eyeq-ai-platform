import type { LucideIcon } from 'lucide-react';
import {
  Home,
  CalendarDays,
  CalendarPlus,
  MessageSquare,
  Pill,
  FileText,
  ClipboardCheck,
  Receipt,
  BookOpen,
  UserRound,
} from 'lucide-react';

export type PatientNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

/** Single source of truth for patient portal navigation. */
export const PATIENT_NAV: PatientNavItem[] = [
  { href: '/patient/home', label: 'Home', icon: Home, exact: true },
  { href: '/patient/appointments', label: 'Appointments', icon: CalendarDays },
  { href: '/patient/book', label: 'Book appointment', icon: CalendarPlus },
  { href: '/patient/messages', label: 'Messages', icon: MessageSquare },
  { href: '/patient/prescriptions', label: 'Prescriptions', icon: Pill },
  { href: '/patient/visits', label: 'Visit summaries', icon: FileText },
  { href: '/patient/forms', label: 'Forms', icon: ClipboardCheck },
  { href: '/patient/billing', label: 'Billing', icon: Receipt },
  { href: '/patient/education', label: 'Eye health library', icon: BookOpen },
  { href: '/patient/profile', label: 'Profile', icon: UserRound },
];
