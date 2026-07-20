import { NextResponse } from 'next/server';
import { claimNextJobs } from '@/lib/jobs/queue';
import { processBackgroundJob } from '@/lib/jobs/processor';
import { serverEnv } from '@/lib/env';
import { isProductionApp } from '@/lib/production/mode';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Job processor endpoint. Always requires JOB_PROCESSOR_SECRET in production
 * and staging. Development may omit the secret only when APP_ENV is not production.
 */
export async function POST(request: Request) {
  const secret = serverEnv.jobProcessorSecret;

  if (!secret) {
    if (isProductionApp() || process.env.APP_ENV === 'staging') {
      return NextResponse.json(
        {
          error: 'JOB_PROCESSOR_SECRET is required. Job processing is disabled until configured.',
        },
        { status: 503 },
      );
    }
    // Non-production without secret: still require a local-dev header to avoid open abuse.
    const local = request.headers.get('x-eyeq-job-dev');
    if (local !== 'allow') {
      return NextResponse.json(
        {
          error:
            'JOB_PROCESSOR_SECRET is not set. Set the secret, or pass x-eyeq-job-dev: allow in development only.',
        },
        { status: 401 },
      );
    }
  } else {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const jobs = await claimNextJobs(5);
  const results = [];

  for (const job of jobs) {
    await processBackgroundJob(job);
    results.push({ id: job.id, type: job.type });
  }

  return NextResponse.json({ processed: results.length, jobs: results });
}
