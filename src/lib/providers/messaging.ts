import 'server-only';

import { twilioMessagingProvider } from './messaging/twilio';

import { sendgridEmailProvider } from './email/sendgrid';

import type { EmailProvider, MessagingProvider } from './index';



const smsStub: MessagingProvider = {

  channel: 'sms',

  isConfigured: () => false,

  async send() {

    throw new Error('SMS provider not configured. Set TWILIO_* env vars. See docs/EYEQ_INTEGRATION_REQUIREMENTS.md.');

  },

};



const emailStub: EmailProvider = {

  name: 'none',

  isConfigured: () => false,

  async send() {

    throw new Error('Email provider not configured. Set SENDGRID_* env vars. See docs/EYEQ_INTEGRATION_REQUIREMENTS.md.');

  },

};



export function getMessagingProvider(): MessagingProvider {

  if (twilioMessagingProvider.isConfigured()) return twilioMessagingProvider;

  return smsStub;

}



export function getEmailProvider(): EmailProvider {

  if (sendgridEmailProvider.isConfigured()) return sendgridEmailProvider;

  return emailStub;

}



export function isSmsConfigured(): boolean {

  return getMessagingProvider().isConfigured();

}



export function isEmailConfigured(): boolean {

  return getEmailProvider().isConfigured();

}


