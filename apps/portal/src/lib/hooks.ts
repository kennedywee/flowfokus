import { useCallback, useState } from "react";
import type { Failure, Result } from "./result";
import { createIdempotencyKey } from "./idempotency";

/** A key for one write attempt. Keep it for retries; renew it after success. */
export function useIdempotencyKey(): [string, () => void] {
  const [key, setKey] = useState(createIdempotencyKey);
  const renew = useCallback(() => setKey(createIdempotencyKey()), []);
  return [key, renew];
}

export interface ActionState<T> {
  pending: boolean;
  error: Failure | null;
  data: T | null;
}

/**
 * Runs a server function that returns a `Result`. Tracks pending, the last
 * failure, and the last success. A thrown error becomes a failure too.
 */
export function useAction<TInput, TData>(fn: (input: TInput) => Promise<Result<TData>>) {
  const [state, setState] = useState<ActionState<TData>>({ pending: false, error: null, data: null });

  const run = useCallback(
    async (input: TInput): Promise<Result<TData>> => {
      setState((current) => ({ ...current, pending: true, error: null }));
      let result: Result<TData>;
      try {
        result = await fn(input);
      } catch {
        result = {
          ok: false,
          error: { status: 0, code: "invalid_input", message: "The request was not accepted. Reload the page and try again." },
        };
      }
      setState(result.ok ? { pending: false, error: null, data: result.data } : { pending: false, error: result.error, data: null });
      return result;
    },
    [fn],
  );

  const reset = useCallback(() => setState({ pending: false, error: null, data: null }), []);
  return { ...state, run, reset };
}
