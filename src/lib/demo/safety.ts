/** Shown after demo billing, claims, and payment actions that stay in-app only. */
export const DEMO_EXTERNAL_ACTION_MESSAGE =
  'This is a demo action. No real patient, payer, pharmacy, lab, or payment processor was contacted.';

export type DemoActionNotice = {
  demoAction?: boolean;
  demoMessage?: string;
};

export function isDemoActionResult(
  data: unknown,
): data is DemoActionNotice & { demoAction: true } {
  return Boolean(
    data && typeof data === 'object' && (data as DemoActionNotice).demoAction,
  );
}
