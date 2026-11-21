import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// The DOM exists only for this file, so other tests keep their server-render setup.
GlobalRegistrator.register();
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { CommentComposer } = await import("./Activity");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot> | undefined;
let host: HTMLElement | undefined;

async function render(onSubmit: (text: string) => void | Promise<unknown>) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(<CommentComposer initials="KW" onSubmit={onSubmit} />));
  return {
    input: host.querySelector<HTMLTextAreaElement>("textarea")!,
    submit: () => host!.querySelector<HTMLButtonElement>("button.composer__submit")!,
  };
}

async function type(input: HTMLTextAreaElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  root = undefined;
});

afterAll(() => GlobalRegistrator.unregister());

describe("CommentComposer", () => {
  test("a second submit while the save is pending does nothing", async () => {
    let calls = 0;
    let settle!: () => void;
    const { input, submit } = await render(() => {
      calls += 1;
      return new Promise<void>((resolve) => (settle = resolve));
    });
    await type(input, "First");
    await act(async () => submit().click());
    expect(submit().disabled).toBe(true);
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true, bubbles: true }));
    });
    expect(calls).toBe(1);
    await act(async () => settle());
    expect(input.value).toBe("");
  });

  test("text typed while the save is pending stays", async () => {
    let settle!: () => void;
    const { input, submit } = await render(() => new Promise<void>((resolve) => (settle = resolve)));
    await type(input, "First");
    await act(async () => submit().click());
    await type(input, "First and more");
    await act(async () => settle());
    expect(input.value).toBe("First and more");
  });

  test("a failed save keeps the draft and shows an error", async () => {
    const { input, submit } = await render(() => Promise.reject(new Error("offline")));
    await type(input, "Keep me");
    await act(async () => submit().click());
    expect(input.value).toBe("Keep me");
    expect(host!.querySelector('[role="alert"]')?.textContent).toContain("not saved");
    expect(submit().disabled).toBe(false);
    await type(input, "Keep me now");
    expect(host!.querySelector('[role="alert"]')).toBeNull();
  });
});
