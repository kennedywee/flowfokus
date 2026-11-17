import { createIdempotencyKey } from "../../lib/idempotency";
import type { Result } from "../../lib/result";

/**
 * One check-in attempt: who, where, and the key Rails uses to record it once.
 * A retry of the same attempt sends the same key, so Rails replays the first
 * answer instead of recording a second check-in.
 */
export interface CheckInAttempt {
  memberId: string;
  locationId: string;
  /** Set only when staff let a denied member in. */
  overrideReason?: string;
  idempotencyKey: string;
}

export type AttemptInput = Omit<CheckInAttempt, "idempotencyKey">;

function sameRequest(attempt: CheckInAttempt, input: AttemptInput): boolean {
  return (
    attempt.memberId === input.memberId &&
    attempt.locationId === input.locationId &&
    (attempt.overrideReason ?? "") === (input.overrideReason ?? "")
  );
}

/**
 * The attempt to send for `input`. It keeps the earlier attempt, and its key,
 * when that attempt did not get an answer and asks for the same thing. Any
 * other request is a new attempt with a new key.
 */
export function attemptFor(
  input: AttemptInput,
  unanswered: CheckInAttempt | null,
  newKey: () => string = createIdempotencyKey,
): CheckInAttempt {
  if (unanswered && sameRequest(unanswered, input)) return unanswered;
  return { ...input, idempotencyKey: newKey() };
}

/**
 * Sends check-in attempts one at a time. While one is in flight, another call
 * gets the same promise and sends nothing, so a double click or a second Enter
 * cannot record two check-ins. After an answer, a failed attempt stays
 * `unanswered` so Try again can send it again with the same key.
 */
export function createCheckInSender<T>(send: (attempt: CheckInAttempt) => Promise<Result<T>>) {
  let inFlight: Promise<Result<T>> | null = null;
  let unanswered: CheckInAttempt | null = null;

  return {
    /** The last attempt that failed without an answer from Rails, if any. */
    get unanswered() {
      return unanswered;
    },
    get pending() {
      return inFlight !== null;
    },
    send(input: AttemptInput): Promise<Result<T>> {
      if (inFlight) return inFlight;
      const attempt = attemptFor(input, unanswered);
      unanswered = attempt;
      inFlight = send(attempt)
        .catch(
          (): Result<T> => ({
            ok: false,
            error: { status: 0, code: "api_unreachable", message: "The check-in was not sent." },
          }),
        )
        .then((result) => {
          // Rails answered: the key is used. A failure keeps it for Try again.
          if (result.ok) unanswered = null;
          inFlight = null;
          return result;
        });
      return inFlight;
    },
  };
}
