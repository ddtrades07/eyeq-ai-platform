import type { ReminderChannel, ReminderType, SupportedLocale } from '@prisma/client';

/**
 * Sane PHI-safe starter templates. Practices can override per language
 * via Prisma `ReminderTemplate` records.
 */
export type StarterReminder = {
  type: ReminderType;
  channel: ReminderChannel;
  locale: SupportedLocale;
  name: string;
  subject?: string;
  body: string;
  variables: string[];
};

export const STARTER_REMINDERS: StarterReminder[] = [
  {
    type: 'APPOINTMENT_REMINDER',
    channel: 'SMS',
    locale: 'EN',
    name: 'Appointment reminder · SMS · EN',
    body: 'Hi {{firstName}}, this is a reminder of your visit at {{practiceName}} on {{appointmentDate}}. Reply Y to confirm.',
    variables: ['firstName', 'practiceName', 'appointmentDate'],
  },
  {
    type: 'APPOINTMENT_REMINDER',
    channel: 'EMAIL',
    locale: 'EN',
    name: 'Appointment reminder · Email · EN',
    subject: 'Reminder: your upcoming visit',
    body: 'Hi {{firstName}},\n\nThis is a friendly reminder of your visit at {{practiceName}} on {{appointmentDate}}.\nReply or call us if you need to reschedule.\n\n- The {{practiceName}} team',
    variables: ['firstName', 'practiceName', 'appointmentDate'],
  },
  {
    type: 'RECALL_REMINDER',
    channel: 'SMS',
    locale: 'EN',
    name: 'Annual exam recall · SMS · EN',
    body: 'Hi {{firstName}}, it has been a while! It might be time for your annual visit at {{practiceName}}. Tap to book: {{bookingLink}}.',
    variables: ['firstName', 'practiceName', 'bookingLink'],
  },
  {
    type: 'CL_RX_EXPIRATION',
    channel: 'EMAIL',
    locale: 'EN',
    name: 'CL Rx expiring soon · Email · EN',
    subject: 'Your contact lens prescription',
    body: 'Hi {{firstName}}, your contact lens prescription is expiring on {{rxExpires}}. Schedule a brief follow-up at {{bookingLink}}.',
    variables: ['firstName', 'rxExpires', 'bookingLink'],
  },
  {
    type: 'GLASSES_RX_EXPIRATION',
    channel: 'EMAIL',
    locale: 'EN',
    name: 'Glasses Rx expiring soon · Email · EN',
    subject: 'Time for an updated prescription?',
    body: 'Hi {{firstName}}, your glasses prescription expires on {{rxExpires}}. Book a refresh at {{bookingLink}}.',
    variables: ['firstName', 'rxExpires', 'bookingLink'],
  },
  {
    type: 'DIABETIC_EXAM_REMINDER',
    channel: 'SMS',
    locale: 'EN',
    name: 'Diabetic eye exam reminder · SMS · EN',
    body: 'Hi {{firstName}}, a yearly diabetic eye exam helps protect your vision. Book yours at {{practiceName}}: {{bookingLink}}.',
    variables: ['firstName', 'practiceName', 'bookingLink'],
  },
  {
    type: 'DRY_EYE_FOLLOWUP',
    channel: 'EMAIL',
    locale: 'EN',
    name: 'Dry eye follow-up · Email · EN',
    subject: 'Checking in on your dry eye treatment',
    body: 'Hi {{firstName}},\n\nWe wanted to check in on your dry eye plan. If your symptoms have changed, please reply or book a follow-up at {{bookingLink}}.',
    variables: ['firstName', 'bookingLink'],
  },
  {
    type: 'NO_SHOW_RECOVERY',
    channel: 'SMS',
    locale: 'EN',
    name: 'No-show recovery · SMS · EN',
    body: 'Hi {{firstName}}, we missed you at your visit today. Tap to rebook: {{bookingLink}}.',
    variables: ['firstName', 'bookingLink'],
  },
  {
    type: 'POST_VISIT_INSTRUCTIONS',
    channel: 'EMAIL',
    locale: 'EN',
    name: 'Post-visit summary · Email · EN',
    subject: 'Your visit summary',
    body: 'Hi {{firstName}},\n\nThanks for visiting {{practiceName}} today. Your provider will share any plan updates through the patient portal. Call us if anything feels worse.\n\n- The {{practiceName}} team',
    variables: ['firstName', 'practiceName'],
  },
  {
    type: 'PORTAL_INVITATION',
    channel: 'EMAIL',
    locale: 'EN',
    name: 'Portal invitation · Email · EN',
    subject: 'Activate your patient portal',
    body: 'Hi {{firstName}}, your {{practiceName}} portal is ready. Activate it at {{portalUrl}} to view your visits, prescriptions, and messages.',
    variables: ['firstName', 'practiceName', 'portalUrl'],
  },
  {
    type: 'APPOINTMENT_REMINDER',
    channel: 'SMS',
    locale: 'ES',
    name: 'Recordatorio de cita · SMS · ES',
    body: 'Hola {{firstName}}, le recordamos su cita en {{practiceName}} el {{appointmentDate}}. Responda Y para confirmar.',
    variables: ['firstName', 'practiceName', 'appointmentDate'],
  },
  {
    type: 'PORTAL_INVITATION',
    channel: 'EMAIL',
    locale: 'ES',
    name: 'Invitación al portal · Email · ES',
    subject: 'Active su portal del paciente',
    body: 'Hola {{firstName}}, su portal de {{practiceName}} está listo. Actívelo en {{portalUrl}}.',
    variables: ['firstName', 'practiceName', 'portalUrl'],
  },
];

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  APPOINTMENT_REMINDER: 'Appointment reminder',
  APPOINTMENT_CONFIRMATION: 'Appointment confirmation',
  RECALL_REMINDER: 'Recall reminder',
  NO_SHOW_RECOVERY: 'No-show recovery',
  CL_RX_EXPIRATION: 'CL Rx expiration',
  GLASSES_RX_EXPIRATION: 'Glasses Rx expiration',
  DIABETIC_EXAM_REMINDER: 'Diabetic exam reminder',
  DRY_EYE_FOLLOWUP: 'Dry eye follow-up',
  IMAGING_FOLLOWUP: 'Imaging follow-up',
  ANNUAL_EXAM_REMINDER: 'Annual exam reminder',
  POST_VISIT_INSTRUCTIONS: 'Post-visit instructions',
  PORTAL_INVITATION: 'Portal invitation',
  CUSTOM: 'Custom',
};

export const REMINDER_CHANNEL_LABELS: Record<ReminderChannel, string> = {
  SMS: 'SMS',
  EMAIL: 'Email',
  PORTAL: 'Portal message',
  PHONE_CALL_SCRIPT: 'Phone call script',
};
