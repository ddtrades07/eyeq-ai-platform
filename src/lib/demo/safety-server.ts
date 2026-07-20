import 'server-only';

import { serverEnv } from '@/lib/env';
import { DEMO_ORG_SLUG } from '@/lib/demo/constants';
import { DEMO_EXTERNAL_ACTION_MESSAGE, type DemoActionNotice } from '@/lib/demo/safety';

export function isDemoTenant(organizationSlug: string | null | undefined): boolean {
  return serverEnv.demoModeEnabled && organizationSlug === DEMO_ORG_SLUG;
}

export function demoActionNotice(
  organizationSlug: string | null | undefined,
): DemoActionNotice {
  if (!isDemoTenant(organizationSlug)) return {};
  return {
    demoAction: true,
    demoMessage: DEMO_EXTERNAL_ACTION_MESSAGE,
  };
}

export function withDemoNotice<T extends Record<string, unknown>>(
  data: T,
  organizationSlug: string | null | undefined,
): T & DemoActionNotice {
  return { ...data, ...demoActionNotice(organizationSlug) };
}
