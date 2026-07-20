import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import { formatFullName } from '@/lib/utils';
import { runCopilot, roleToCopilotRole } from '@/lib/ai/copilot';
import type { CopilotContext, CopilotMessage, PageContext, ExplainabilityBlock } from '@/lib/ai/copilot';
import {
  appendSafetyFooter,
  requiresPatientContext,
  SELECT_PATIENT_PHRASE,
} from '@/lib/ai/safety';
import { AIGatewayError, isAiAvailable } from '@/lib/ai-gateway';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const UNCONFIGURED_MESSAGE = `**AI assistant is not configured**

EyeQ AI requires an approved LLM provider with proper configuration before it can respond to questions.

**What you can do now:**
- Continue charting, scheduling, and imaging workflows manually
- Ask your practice administrator to configure AI providers in Settings

⚠️ Provider review required for all clinical documentation.`;

const GATEWAY_ERROR_MESSAGE = `**AI assistant is temporarily unavailable**

We could not complete this request through the EyeQ AI Gateway. Your chart data is unchanged.

Please try again shortly, or continue your workflow manually.`;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message, conversationId, history = [], page = 'other', patientId } = body as {
    message?: string;
    conversationId?: string;
    history?: CopilotMessage[];
    page?: string;
    patientId?: string;
  };

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }

  if (requiresPatientContext(message) && !patientId) {
    return streamResponse(
      SELECT_PATIENT_PHRASE,
      crypto.randomUUID(),
      {
        heading: 'Why EyeQ said this',
        factors: ['No patient selected in Ask EyeQ context.'],
        disclaimer: 'Select a patient before asking chart-specific questions.',
      },
      ['Search for a patient', "Open today's schedule"],
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return streamResponse(
      'Please sign in to use EyeQ AI.',
      crypto.randomUUID(),
      {
        heading: 'Authentication required',
        factors: ['No active session.'],
        disclaimer: 'Sign in to continue.',
      },
      [],
    );
  }

  if (!hasPermission(user.role, 'ai:use')) {
    return NextResponse.json({ error: 'AI not permitted for your role' }, { status: 403 });
  }

  const rate = checkRateLimit({
    key: `copilot:${user.id}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rate.retryAfterMs ?? 60000) / 1000)) } },
    );
  }

  if (!user.organizationId) {
    return streamResponse(
      'Complete practice setup before using EyeQ AI.',
      crypto.randomUUID(),
      {
        heading: 'Practice setup required',
        factors: ['No organization linked to your account.'],
        disclaimer: 'Contact your administrator.',
      },
      [],
    );
  }

  if (!isAiAvailable()) {
    return streamResponse(
      UNCONFIGURED_MESSAGE,
      crypto.randomUUID(),
      {
        heading: 'AI not configured',
        factors: ['No approved LLM provider is configured.', 'Mock AI is disabled in HIPAA mode.'],
        disclaimer: 'Configure an approved AI vendor to enable the assistant.',
      },
      ['Open settings', 'Continue manual workflow'],
    );
  }

  try {
    const copilotRole = roleToCopilotRole(user.role);
    const ctx: CopilotContext = {
      userRole: user.role,
      copilotRole,
      page: (page ?? 'other') as PageContext,
      organizationId: user.organizationId,
      userId: user.id,
      userName: formatFullName(user.firstName, user.lastName),
      patientId: (patientId as string) || null,
    };

    const result = await runCopilot({
      message,
      conversationId: conversationId ?? crypto.randomUUID(),
      history: (history ?? []) as CopilotMessage[],
      context: ctx,
    });

    return streamResponse(
      appendSafetyFooter(result.message.content),
      result.message.id,
      result.message.explainability,
      result.suggestedFollowUps,
    );
  } catch (err) {
    console.error('[copilot/stream] gateway error:', err);

    if (err instanceof AIGatewayError) {
      if (err.code === 'PHI_BLOCKED') {
        return streamResponse(
          err.message,
          crypto.randomUUID(),
          {
            heading: 'PHI Safety Gate',
            factors: ['Sensitive information detected.', 'Configure approved vendor and BAA to transmit PHI.'],
            disclaimer: 'Request was not sent to an external AI provider.',
          },
          [],
        );
      }
      if (err.code === 'FORBIDDEN') {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      if (err.code === 'SHUTDOWN' || err.code === 'NO_PROVIDER') {
        return streamResponse(
          err.message,
          crypto.randomUUID(),
          {
            heading: 'AI unavailable',
            factors: [err.message],
            disclaimer: 'Core EyeQ workflows remain available.',
          },
          [],
        );
      }
    }

    return streamResponse(
      GATEWAY_ERROR_MESSAGE,
      crypto.randomUUID(),
      {
        heading: 'Request failed',
        factors: ['The AI Gateway could not complete this request.'],
        disclaimer: 'Try again or continue manually. No chart data was modified.',
      },
      [],
    );
  }
}

function streamResponse(
  fullText: string,
  messageId: string,
  explainability?: ExplainabilityBlock,
  suggestedFollowUps?: string[],
): NextResponse {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const words = fullText.split(' ');
        const chunkSize = 4;
        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(' ') + (i + chunkSize < words.length ? ' ' : '');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: chunk })}\n\n`));
          await new Promise((r) => setTimeout(r, 12 + Math.random() * 18));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'done',
          id: messageId,
          explainability,
          suggestedFollowUps: suggestedFollowUps ?? [],
        })}\n\n`));
      } catch (err) {
        console.error('[copilot/stream] stream error:', err);
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
