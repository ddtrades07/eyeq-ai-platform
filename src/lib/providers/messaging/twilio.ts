import 'server-only';
import { serverEnv } from '@/lib/env';
import type { MessagingProvider } from '../index';

export const twilioMessagingProvider: MessagingProvider = {
  channel: 'sms',

  isConfigured() {
    return Boolean(
      serverEnv.twilioAccountSid &&
        serverEnv.twilioAuthToken &&
        serverEnv.twilioFromNumber &&
        serverEnv.twilioBaaConfirmed,
    );
  },

  async send({ to, body }) {
    const sid = serverEnv.twilioAccountSid;
    const token = serverEnv.twilioAuthToken;
    const from = serverEnv.twilioFromNumber;
    if (!sid || !token || !from) {
      throw new Error('Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.');
    }
    if (!serverEnv.twilioBaaConfirmed) {
      throw new Error('Twilio BAA must be confirmed (TWILIO_BAA_CONFIRMED=true) before sending SMS.');
    }

    const params = new URLSearchParams({ To: to, From: from, Body: body });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Twilio API ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    return {
      messageId: data.sid as string,
      status: data.status === 'queued' || data.status === 'sent' ? 'sent' : 'queued',
    };
  },
};
