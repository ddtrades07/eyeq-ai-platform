import 'server-only';
import type { Role } from '@prisma/client';
import { executeAIRequest, isAiAvailable } from '@/lib/ai-gateway';
import { REVIEW_REPLY_SYSTEM_PROMPT } from './prompts';

export type ReviewReplyDraftResult = {
  replyText: string;
  source: 'ai-gateway' | 'template';
  gatewayRequestId?: string;
};

function firstName(reviewerName: string): string {
  return reviewerName.trim().split(/\s+/)[0] || 'there';
}

function templateReply(args: {
  practiceName: string;
  reviewerName: string;
  starRating: number;
  comment: string | null;
}): string {
  const name = firstName(args.reviewerName);
  const practice = args.practiceName;

  if (args.starRating >= 4) {
    return `Thank you, ${name}, for sharing your experience with ${practice}! We are glad our team could care for your vision. We look forward to seeing you again.`;
  }
  if (args.starRating === 3) {
    return `Thank you for your feedback, ${name}. We appreciate you taking the time to review ${practice}. We would welcome the chance to learn more about your visit: please contact our office when convenient.`;
  }
  return `We are sorry your experience at ${practice} did not meet your expectations, ${name}. Your feedback helps us improve. A member of our team would like to follow up with you personally: please call our office at your convenience.`;
}

export async function generateReviewReplyDraft(args: {
  userId: string;
  organizationId: string;
  role: Role;
  practiceName: string;
  reviewerName: string;
  starRating: number;
  comment: string | null;
  locationName?: string | null;
}): Promise<ReviewReplyDraftResult> {
  const userMessage = [
    `Practice: ${args.practiceName}`,
    args.locationName ? `Location: ${args.locationName}` : null,
    `Reviewer: ${args.reviewerName}`,
    `Star rating: ${args.starRating}/5`,
    `Review text: ${args.comment?.trim() || '(no written comment)'}`,
    '',
    'Draft a public Google review reply.',
  ]
    .filter(Boolean)
    .join('\n');

  if (isAiAvailable()) {
    try {
      const result = await executeAIRequest({
        userId: args.userId,
        practiceId: args.organizationId,
        role: args.role,
        requestType: 'REVIEW_REPLY_DRAFT',
        requestedAction: 'draft_google_review_reply',
        message: userMessage,
        requiresProviderReview: true,
        context: {
          systemPrompt: REVIEW_REPLY_SYSTEM_PROMPT,
          temperature: 0.4,
          maxTokens: 400,
        },
      });

      const text = (result.humanReadableOutput ?? '').trim();
      if (text) {
        return {
          replyText: text,
          source: 'ai-gateway',
          gatewayRequestId: result.requestId,
        };
      }
    } catch {
      // Fall through to template when gateway unavailable.
    }
  }

  return {
    replyText: templateReply({
      practiceName: args.practiceName,
      reviewerName: args.reviewerName,
      starRating: args.starRating,
      comment: args.comment,
    }),
    source: 'template',
  };
}
