import type { z } from 'zod';

/** Safe string for JSON `{ error }` and React UI — never pass `flatten()` objects to clients. */
export function zodErrorMessage(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join('; ');
}
