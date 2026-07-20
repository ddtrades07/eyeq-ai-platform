import 'server-only';

import type { ClaimsClearinghouseProvider, EligibilityProvider } from '@/lib/providers';
import { isSimulatedClaimsAllowed } from '@/lib/production/mode';
import { stubClearinghouseProvider, stubEligibilityProvider } from './stub';

/**
 * Returns the active clearinghouse adapter, or null when none is configured.
 * Stub simulation is only returned when explicitly allowed (demo / dev).
 */
export function getClearinghouseProvider(): ClaimsClearinghouseProvider | null {
  // Future: wire real vendor when CLEARINGHOUSE_VENDOR + credentials are set.
  if (isSimulatedClaimsAllowed() && stubClearinghouseProvider.isConfigured()) {
    return stubClearinghouseProvider;
  }
  return null;
}

export function getEligibilityProvider(): EligibilityProvider | null {
  if (isSimulatedClaimsAllowed() && stubEligibilityProvider.isConfigured()) {
    return stubEligibilityProvider;
  }
  return null;
}

export function isClearinghouseConfigured(): boolean {
  return getClearinghouseProvider()?.isConfigured() ?? false;
}
