import { describe, expect, test } from "bun:test";
import type { Result } from "../../lib/result";
import { attemptFor, createCheckInSender, type CheckInAttempt } from "./attempt";

const input = { memberId: "m1", locationId: "l1" };
const failed: Result<string> = { ok: false, error: { status: 0, code: "api_unreachable", message: "No answer" } };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

describe("attemptFor", () => {
  test("keeps the key for the same unanswered request", () => {
    const first = attemptFor(input, null, () => "k1");
    expect(attemptFor(input, first, () => "k2")).toBe(first);
  });

  test("uses a new key for a different member, location, or reason", () => {
    const first = attemptFor(input, null, () => "k1");
    expect(attemptFor({ ...input, memberId: "m2" }, first, () => "k2").idempotencyKey).toBe("k2");
    expect(attemptFor({ ...input, locationId: "l2" }, first, () => "k2").idempotencyKey).toBe("k2");
    expect(attemptFor({ ...input, overrideReason: "Paying today" }, first, () => "k2").idempotencyKey).toBe("k2");
  });
});

describe("createCheckInSender", () => {
  test("a double click sends one request", async () => {
    const answer = deferred<Result<string>>();
    const sent: CheckInAttempt[] = [];
    const sender = createCheckInSender((attempt) => {
      sent.push(attempt);
      return answer.promise;
    });

    const first = sender.send(input);
    const second = sender.send(input);
    expect(sender.pending).toBe(true);
    answer.resolve({ ok: true, data: "checked in" });

    expect(await first).toEqual({ ok: true, data: "checked in" });
    expect(await second).toEqual({ ok: true, data: "checked in" });
    expect(sent).toHaveLength(1);
    expect(sender.pending).toBe(false);
  });

  test("Try again after a failure sends the same key", async () => {
    const sent: CheckInAttempt[] = [];
    const answers: Result<string>[] = [failed, { ok: true, data: "checked in" }];
    const sender = createCheckInSender(async (attempt) => {
      sent.push(attempt);
      return answers.shift()!;
    });

    expect((await sender.send(input)).ok).toBe(false);
    expect(sender.unanswered?.idempotencyKey).toBe(sent[0]!.idempotencyKey);
    expect((await sender.send(input)).ok).toBe(true);

    expect(sent).toHaveLength(2);
    expect(sent[1]!.idempotencyKey).toBe(sent[0]!.idempotencyKey);
    expect(sender.unanswered).toBeNull();
  });

  test("a thrown request counts as a failure and keeps the key", async () => {
    const sent: CheckInAttempt[] = [];
    let calls = 0;
    const sender = createCheckInSender(async (attempt) => {
      sent.push(attempt);
      if (calls++ === 0) throw new Error("network");
      return { ok: true, data: "checked in" } as Result<string>;
    });

    const result = await sender.send(input);
    expect(result.ok).toBe(false);
    await sender.send(input);
    expect(sent[1]!.idempotencyKey).toBe(sent[0]!.idempotencyKey);
  });

  test("the next check-in after a success gets a new key", async () => {
    const sent: CheckInAttempt[] = [];
    const sender = createCheckInSender(async (attempt) => {
      sent.push(attempt);
      return { ok: true, data: "checked in" } as Result<string>;
    });

    await sender.send(input);
    await sender.send(input);
    expect(sent[1]!.idempotencyKey).not.toBe(sent[0]!.idempotencyKey);
  });

  test("letting a member in after a denial is a new attempt with its own key", async () => {
    const sent: CheckInAttempt[] = [];
    const answers: Result<string>[] = [{ ok: true, data: "denied" }, failed, { ok: true, data: "let in" }];
    const sender = createCheckInSender(async (attempt) => {
      sent.push(attempt);
      return answers.shift()!;
    });

    await sender.send(input);
    await sender.send({ ...input, overrideReason: "Paying today" });
    await sender.send({ ...input, overrideReason: "Paying today" });
    expect(sent[1]!.idempotencyKey).not.toBe(sent[0]!.idempotencyKey);
    expect(sent[2]!.idempotencyKey).toBe(sent[1]!.idempotencyKey);
  });
});
