/**
 * One-off maintenance script: wipe and re-provision the demo tenant.
 *
 * Usage: npm run demo:reset
 * Safe: resetDemoMode() is scoped strictly to the eyeq-demo organization.
 */
import { resetDemoMode } from '../src/lib/demo/provision';

async function main() {
  console.log('[demo:reset] Re-provisioning the demo tenant...');
  const orgId = await resetDemoMode();
  console.log(`[demo:reset] Done. Demo org id: ${orgId}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[demo:reset] Failed:', err);
  process.exit(1);
});
