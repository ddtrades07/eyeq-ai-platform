import 'server-only';

import { serverEnv } from '@/lib/env';

export type AppEnvironment = 'development' | 'test' | 'staging' | 'production' | 'demo';

/** Resolved application environment (APP_ENV overrides NODE_ENV when set). */
export function getAppEnvironment(): AppEnvironment {
  const raw = process.env.APP_ENV?.toLowerCase();
  if (raw === 'production' || raw === 'staging' || raw === 'test' || raw === 'demo') {
    return raw;
  }
  if (process.env.NODE_ENV === 'test') return 'test';
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
}

export function isProductionApp(): boolean {
  return getAppEnvironment() === 'production';
}

export function isDemoAppEnvironment(): boolean {
  return getAppEnvironment() === 'demo' || serverEnv.demoModeEnabled;
}

/** Simulated vendor responses (claims, payments) are never allowed in production unless demo tenant + explicit flag. */
export function isSimulatedClaimsAllowed(): boolean {
  if (serverEnv.allowSimulatedClaims) {
    if (isProductionApp() && !serverEnv.demoModeEnabled) return false;
    return true;
  }
  return false;
}

export function isSimulatedPaymentsAllowed(): boolean {
  if (serverEnv.allowSimulatedPayments) {
    if (isProductionApp() && !serverEnv.demoModeEnabled) return false;
    return true;
  }
  return false;
}

export function isSeedDataAllowed(): boolean {
  if (!serverEnv.allowSeedData) return false;
  if (isProductionApp()) return false;
  return true;
}

export function isTestMessagesAllowed(): boolean {
  return serverEnv.allowTestMessages && !isProductionApp();
}

/** Human-readable reason when a simulated integration is blocked. */
export function simulatedIntegrationBlockedReason(integration: string): string {
  if (isProductionApp() && !serverEnv.demoModeEnabled) {
    return `${integration} simulation is disabled in production. Configure a live vendor integration or use the manual workflow.`;
  }
  return `${integration} simulation is disabled. Set ALLOW_SIMULATED_${integration.toUpperCase()}=true in a non-production demo environment.`;
}
