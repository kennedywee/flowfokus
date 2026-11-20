import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// The DOM exists only for this file, so other tests keep their server-render setup.
GlobalRegistrator.register();
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { HOLD_MS, HoldButton, isAssistiveClick } = await import("./hold-button");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const wait = (ms: number) => act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

let root: ReturnType<typeof createRoot> | undefined;
let host: HTMLElement | undefined;

async function renderButton(onConfirm: () => unknown) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(
      <HoldButton onConfirm={onConfirm} holdLabel="Hold to check in" confirmedLabel="Checked in">
        Check in
      </HoldButton>,
    );
  });
  const button = host.querySelector<HTMLButtonElement>("button.hold-button");
  if (!button) throw new Error("HoldButton did not render a button");
  return button;
}

function pointer(el: EventTarget, type: string, init: PointerEventInit = {}) {
  el.dispatchEvent(
    new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0, buttons: 1, ...init }),
  );
}

function key(el: Element, type: "keydown" | "keyup", init: KeyboardEventInit = {}) {
  el.dispatchEvent(new KeyboardEvent(type, { key: " ", bubbles: true, cancelable: true, ...init }));
}

const hint = () => document.querySelector(".tooltip");

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  root = undefined;
});

afterAll(() => GlobalRegistrator.unregister());

describe("HoldButton", () => {
  test("confirms once a pointer press lasts 600 ms, and shows success until the request settles", async () => {
    let settle!: () => void;
    const onConfirm = mock(() => new Promise<void>((resolve) => (settle = resolve)));
    const button = await renderButton(onConfirm);

    await act(async () => pointer(button, "pointerdown"));
    expect(button.hasAttribute("data-holding")).toBe(true);
    await wait(HOLD_MS + 50);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(button.hasAttribute("data-confirmed")).toBe(true);
    expect(button.querySelector(".hold-button__label")?.textContent).toBe("Checked in");

    await act(async () => pointer(document, "pointerup", { buttons: 0 }));
    await act(async () => settle());
    expect(button.hasAttribute("data-confirmed")).toBe(false);
    expect(button.textContent).toBe("Check in");
  });

  test("an early release does nothing and shows the hint", async () => {
    const onConfirm = mock(() => {});
    const button = await renderButton(onConfirm);

    await act(async () => pointer(button, "pointerdown"));
    await wait(200);
    await act(async () => {
      pointer(document, "pointerup", { buttons: 0 });
      // The browser's click after a short press.
      button.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    });
    await wait(HOLD_MS);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(button.hasAttribute("data-holding")).toBe(false);
    expect(hint()?.hasAttribute("data-open")).toBe(true);
    expect(hint()?.textContent).toBe("Hold to check in");
  });

  test("moving the pointer off the button cancels the hold", async () => {
    const onConfirm = mock(() => {});
    const button = await renderButton(onConfirm);

    await act(async () => pointer(button, "pointerdown"));
    await wait(200);
    await act(async () => pointer(button, "pointerleave", { bubbles: false }));
    expect(button.hasAttribute("data-holding")).toBe(false);
    await wait(HOLD_MS);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(hint()?.hasAttribute("data-open")).toBe(true);
  });

  test("holding Space confirms after the same time, and a key repeat does not restart it", async () => {
    const onConfirm = mock(() => {});
    const button = await renderButton(onConfirm);

    await act(async () => key(button, "keydown"));
    await wait(400);
    await act(async () => key(button, "keydown", { repeat: true }));
    await wait(HOLD_MS - 400 + 50);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    await act(async () => key(button, "keyup"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test("a short Enter press does nothing and shows the hint", async () => {
    const onConfirm = mock(() => {});
    const button = await renderButton(onConfirm);

    await act(async () => key(button, "keydown", { key: "Enter" }));
    await wait(100);
    await act(async () => key(button, "keyup", { key: "Enter" }));
    await wait(HOLD_MS);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(hint()?.hasAttribute("data-open")).toBe(true);
  });

  test("a failed request hands the button back and reports the error", async () => {
    const reported: unknown[] = [];
    const original = globalThis.reportError;
    globalThis.reportError = (error) => reported.push(error);
    try {
      const button = await renderButton(() => Promise.reject(new Error("Rails said no")));
      await act(async () => button.click());

      expect(button.hasAttribute("data-confirmed")).toBe(false);
      expect(button.textContent).toBe("Check in");
      expect(reported).toEqual([new Error("Rails said no")]);
    } finally {
      globalThis.reportError = original;
    }
  });

  test("a click from assistive tech confirms at once", async () => {
    const onConfirm = mock(() => {});
    const button = await renderButton(onConfirm);

    // Screen readers and switch controls send a click with no press: detail 0.
    await act(async () => button.click());

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test("keeps the action as the name and the hint as the description", async () => {
    const button = await renderButton(() => {});
    const describedBy = button.getAttribute("aria-describedby");

    expect(button.getAttribute("aria-label")).toBeNull();
    expect(button.textContent).toBe("Check in");
    expect(describedBy && document.getElementById(describedBy)?.textContent).toBe("Hold to check in");
  });

  test("keeps the action as the name while the request runs", async () => {
    const button = await renderButton(() => new Promise(() => {}));
    await act(async () => button.click());

    expect(button.hasAttribute("data-confirmed")).toBe(true);
    expect(button.querySelector(".visually-hidden")?.textContent).toBe("Check in");
    expect(button.querySelector(".hold-button__label")?.getAttribute("aria-hidden")).toBe("true");
    expect(button.querySelector(".hold-button__label")?.textContent).toBe("Checked in");
  });
});

describe("isAssistiveClick", () => {
  test("treats a click with no pointer behind it as assistive tech", () => {
    expect(isAssistiveClick({ detail: 0, pointerType: "mouse" })).toBe(true);
    expect(isAssistiveClick({ detail: 1, pointerType: "" })).toBe(true);
    expect(isAssistiveClick({ detail: 1, pointerType: "mouse" })).toBe(false);
    expect(isAssistiveClick({ detail: 1, pointerType: "touch" })).toBe(false);
    expect(isAssistiveClick({ detail: 1, pointerType: "pen" })).toBe(false);
    // Browsers whose click is a plain MouseEvent have no pointer type.
    expect(isAssistiveClick({ detail: 1 })).toBe(false);
  });
});

describe("reduced motion", () => {
  const css = readFileSync(new URL("../../styles/components.css", import.meta.url), "utf8");
  const block = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce) {\n  /* No scale and no sweep"));
  const reduced = block.slice(0, block.indexOf("\n}\n"));

  test("drops the scale and the sweep, and fades the fill in over the hold time", () => {
    expect(reduced).toContain(".button.hold-button[data-holding] {\n    transform: none;");
    expect(reduced).toMatch(/\.hold-button__fill,\n  \.hold-button\[data-holding\] \.hold-button__fill \{\n    transform: none;/);
    expect(reduced).toContain("transition: opacity var(--duration-hold) var(--ease-in);");
  });

  test("the fill is exempt from base.css cutting every transition to 1ms", () => {
    const base = readFileSync(new URL("../../styles/base.css", import.meta.url), "utf8");
    expect(base).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^}]*\*:not\(\.hold-button__fill\),/);
  });
});
