'use server';

import { z } from 'zod';
import { action } from '@/lib/server-action';
import { getCurrentUser } from '@/lib/auth/session';
import { AuthError } from '@/lib/auth/require';
import { formatFullName } from '@/lib/utils';
import {
  runCopilot,
  roleToCopilotRole,
  getSuggestedPrompts,
  type CopilotContext,
  type CopilotMessage,
  type CopilotResponse,
  type PageContext,
  type SuggestedPrompt,
} from '@/lib/ai/copilot';

const CopilotMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  explainability: z
    .object({
      heading: z.string(),
      factors: z.array(z.string()),
      disclaimer: z.string(),
    })
    .optional(),
  createdAt: z.string(),
});

const SendMessageSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().optional(),
  history: z.array(CopilotMessageSchema).max(50).default([]),
  page: z.string().default('other'),
  patientId: z.string().nullable().optional(),
});

/**
 * Send a message to the copilot and receive an AI response.
 */
export const sendCopilotMessage = action({
  schema: SendMessageSchema,
  handler: async (input): Promise<CopilotResponse> => {
    const user = await getCurrentUser();
    if (!user) throw new AuthError('Not authenticated', 401);

    const copilotRole = roleToCopilotRole(user.role);
    const ctx: CopilotContext = {
      userRole: user.role,
      copilotRole,
      page: input.page as PageContext,
      organizationId: user.organizationId,
      userId: user.id,
      userName: formatFullName(user.firstName, user.lastName),
      patientId: input.patientId,
    };

    return runCopilot({
      message: input.message,
      conversationId: input.conversationId,
      history: input.history as CopilotMessage[],
      context: ctx,
    });
  },
});

const GetSuggestionsSchema = z.object({
  page: z.string().default('other'),
  patientId: z.string().nullable().optional(),
});

/**
 * Get role- and context-appropriate suggested prompts.
 */
export const getCopilotSuggestions = action({
  schema: GetSuggestionsSchema,
  handler: async (input): Promise<SuggestedPrompt[]> => {
    const user = await getCurrentUser();
    if (!user) throw new AuthError('Not authenticated', 401);

    const copilotRole = roleToCopilotRole(user.role);
    return getSuggestedPrompts(
      copilotRole,
      input.page as PageContext,
      !!input.patientId,
    );
  },
});
