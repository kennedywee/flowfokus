import { afterAll, describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// The DOM exists only for this file, so other tests keep their server-render setup.
GlobalRegistrator.register();
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { LoadMore } = await import("./ListTable");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterAll(() => GlobalRegistrator.unregister());

describe("LoadMore", () => {
  test("a failed request frees Show more, and one request runs at a time", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    let calls = 0;
    let fail: (error: Error) => void = () => undefined;
    const onLoadMore = () => {
      calls += 1;
      return new Promise((_, reject) => {
        fail = reject;
      });
    };
    await act(async () => root.render(<LoadMore loaded={3} loading={false} onLoadMore={onLoadMore} />));
    const button = host.querySelector("button")!;
    await act(async () => button.click());
    await act(async () => button.click());
    expect(calls).toBe(1);
    await act(async () => fail(new Error("offline")));
    await act(async () => button.click());
    expect(calls).toBe(2);
    await act(async () => root.unmount());
  });
});
