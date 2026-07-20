import 'server-only';
import type { ClaimsClearinghouseProvider, EligibilityProvider } from '../index';
import { serverEnv } from '@/lib/env';
import { isSimulatedClaimsAllowed } from '@/lib/production/mode';

export const stubClearinghouseProvider: ClaimsClearinghouseProvider = {
  name: 'stub',

  isConfigured() {
    return serverEnv.clearinghouseEnabled && isSimulatedClaimsAllowed();
  },

  async submitClaim(claimId) {
    if (!isSimulatedClaimsAllowed()) {
      return {
        accepted: false,
        errors: ['Simulated claim submission is disabled in this environment'],
      };
    }
    if (!this.isConfigured()) {
      return { accepted: false, errors: ['Clearinghouse not configured'] };
    }
    return {
      accepted: true,
      externalId: `STUB-${claimId.slice(0, 8)}`,
    };
  },

  async pollClaimStatus(externalId) {
    return { status: externalId.startsWith('STUB-') ? 'accepted' : 'unknown' };
  },
};

export const stubEligibilityProvider: EligibilityProvider = {
  name: 'stub',

  isConfigured() {
    return serverEnv.clearinghouseEnabled && isSimulatedClaimsAllowed();
  },

  async checkEligibility() {
    if (!isSimulatedClaimsAllowed()) {
      return { status: 'unknown', planName: 'Configure eligibility vendor for live checks' };
    }
    return { status: 'unknown', planName: 'Configure clearinghouse for live eligibility' };
  },
};
