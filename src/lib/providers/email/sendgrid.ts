import 'server-only';
import { serverEnv } from '@/lib/env';
import type { EmailProvider } from '../index';

export const sendgridEmailProvider: EmailProvider = {
  name: 'sendgrid',

  isConfigured() {
    return Boolean(
      serverEnv.sendgridApiKey &&
        serverEnv.sendgridFromEmail &&
        serverEnv.sendgridBaaConfirmed,
    );
  },

  async send({ to, subject, html }) {
    const apiKey = serverEnv.sendgridApiKey;
    const from = serverEnv.sendgridFromEmail;
    if (!apiKey || !from) {
      throw new Error('SendGrid is not configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL.');
    }
    if (!serverEnv.sendgridBaaConfirmed) {
      throw new Error('SendGrid BAA must be confirmed (SENDGRID_BAA_CONFIRMED=true) before sending email.');
    }

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`SendGrid API ${res.status}: ${text.slice(0, 200)}`);
    }

    return {
      messageId: res.headers.get('x-message-id') ?? `sendgrid-${Date.now()}`,
      status: 'sent',
    };
  },
};
