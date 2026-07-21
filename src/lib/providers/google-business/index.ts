import 'server-only';
import { serverEnv } from '@/lib/env';
import { db } from '@/lib/db';

export type ExternalGoogleReview = {
  externalReviewId: string;
  reviewerName: string;
  starRating: number;
  comment: string | null;
  reviewedAt: Date;
};

export function isGoogleBusinessConfigured(): boolean {
  return Boolean(serverEnv.googleBusinessApiKey && serverEnv.googleBusinessAccountId);
}

/** Demo / sandbox reviews when no live Google Business Profile connection exists. */
const DEMO_REVIEWS: ExternalGoogleReview[] = [
  {
    externalReviewId: 'demo-review-001',
    reviewerName: 'Sarah M.',
    starRating: 5,
    comment:
      'Dr. Chen and the team were fantastic. Short wait, thorough exam, and they explained my glaucoma monitoring plan clearly.',
    reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    externalReviewId: 'demo-review-002',
    reviewerName: 'James K.',
    starRating: 5,
    comment: 'Best eye exam I have had in years. The OCT imaging walkthrough was really helpful.',
    reviewedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    externalReviewId: 'demo-review-003',
    reviewerName: 'Priya N.',
    starRating: 4,
    comment: 'Friendly staff and clean office. Parking was a little tight but overall a great visit.',
    reviewedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
  },
  {
    externalReviewId: 'demo-review-004',
    reviewerName: 'Robert L.',
    starRating: 3,
    comment: 'Good doctors but I waited 25 minutes past my appointment time.',
    reviewedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  },
  {
    externalReviewId: 'demo-review-005',
    reviewerName: 'Angela T.',
    starRating: 2,
    comment: 'Felt rushed at checkout and billing questions were not answered clearly.',
    reviewedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
  },
];

export async function fetchGoogleReviews(args: {
  connectionId: string;
  demoMode: boolean;
}): Promise<ExternalGoogleReview[]> {
  if (args.demoMode || !isGoogleBusinessConfigured()) {
    return DEMO_REVIEWS;
  }

  const connection = await db.googleBusinessConnection.findUnique({
    where: { id: args.connectionId },
  });
  if (!connection?.googlePlaceId) {
    return [];
  }

  // Live Google Business Profile API integration point.
  // Production: OAuth + My Business API reviews.list
  throw new Error(
    'Google Business Profile API is not fully configured for this practice. Use demo mode or complete OAuth setup.',
  );
}

export async function postGoogleReviewReply(args: {
  connectionId: string;
  externalReviewId: string;
  replyText: string;
  demoMode: boolean;
}): Promise<{ postedAt: Date; mode: 'live' | 'demo' | 'not_configured' }> {
  if (args.demoMode) {
    // Demo org only: caller must persist DEMO_PUBLISHED, never PUBLISHED.
    return { postedAt: new Date(), mode: 'demo' };
  }

  if (!isGoogleBusinessConfigured()) {
    return { postedAt: new Date(), mode: 'not_configured' };
  }

  // Live Google Business Profile API integration point.
  // Production: OAuth + My Business API reviews.updateReply
  throw new Error(
    'Google Business Profile API credentials are present but the live publish adapter is not connected. Reply was not posted to Google.',
  );
}
