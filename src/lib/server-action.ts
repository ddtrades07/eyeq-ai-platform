import 'server-only';
import { ZodError, type ZodTypeAny, type input as zInput, type output as zOutput } from 'zod';
import { AuthError } from '@/lib/auth/require';

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]>; status?: number };

/**
 * Type-safe wrapper for server actions. Validates input with a Zod
 * schema, normalises auth/permission errors, and converts unexpected
 * exceptions into a friendly failure payload that React forms can
 * display via `useActionState`.
 *
 * Callers pass `z.input<T>` (defaults may be omitted); the handler
 * receives `z.output<T>` (defaults applied).
 */
export function action<TSchema extends ZodTypeAny, TOutput>(args: {
  schema: TSchema;
  handler: (input: zOutput<TSchema>) => Promise<TOutput>;
}) {
  return async (raw: zInput<TSchema>): Promise<ActionResult<TOutput>> => {
    try {
      const parsed = args.schema.safeParse(raw);
      if (!parsed.success) {
        return {
          ok: false,
          error: 'Validation failed',
          fieldErrors: flattenZod(parsed.error),
          status: 400,
        };
      }
      const data = await args.handler(parsed.data);
      return { ok: true, data };
    } catch (err) {
      if (err instanceof AuthError) {
        return { ok: false, error: err.message, status: err.status };
      }
      if (err instanceof ZodError) {
        return {
          ok: false,
          error: 'Validation failed',
          fieldErrors: flattenZod(err),
          status: 400,
        };
      }
      const message = err instanceof Error ? err.message : 'Unexpected error';
      // eslint-disable-next-line no-console
      console.error('[action] uncaught', err);
      return { ok: false, error: message, status: 500 };
    }
  };
}

function flattenZod(err: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const path = issue.path.join('.') || '_root';
    (out[path] ??= []).push(issue.message);
  }
  return out;
}
