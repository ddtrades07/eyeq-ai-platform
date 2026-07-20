/**
 * Demo Mode constants.
 *
 * The demo organization is a dedicated, throw-away tenant. Demo auth
 * users are provisioned server-side; credentials never ship to the client.
 */
export const DEMO_ORG_SLUG = 'eyeq-demo';
export const DEMO_ORG_NAME = 'EyeQ Vision Center';

/** @deprecated Use owner.demo@eyeq.local via DEMO_ROLE_ACCOUNTS */
export const DEMO_OWNER_EMAIL = 'demo@eyeqai.app';
/** @deprecated Use DEMO_PASSWORD from accounts.ts */
export const DEMO_OWNER_PASSWORD = 'EyeQDemo!2026';

export { DEMO_PASSWORD, DEMO_ROLE_ACCOUNTS, type DemoRoleKey } from './accounts';
