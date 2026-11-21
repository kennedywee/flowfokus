import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CalendarBlock } from "./Block";

describe("calendar block", () => {
  test("a class shows its time, name, spot stack, and count", () => {
    const html = renderToStaticMarkup(
      <CalendarBlock kind="group_class" state="open" time="19:00 – 20:00" name="Yoga Flow" status="11 of 12" spots={{ capacity: 12, booked: 11 }} />,
    );
    expect(html).toContain('data-kind="group_class"');
    expect(html).toContain('data-state="open"');
    expect(html).toContain("19:00 – 20:00");
    expect(html).toContain("Yoga Flow");
    expect(html).toContain("11 of 12");
    expect(html).toContain("11 of 12 spots booked");
  });

  test("an appointment and an event draw no spot stack", () => {
    const appointment = renderToStaticMarkup(<CalendarBlock kind="appointment" state="open" time="09:00" name="PT with Aina" status="Open" />);
    const event = renderToStaticMarkup(<CalendarBlock kind="event" state="open" time="18:00" name="Seminar" status="18 of 30 sold" />);
    expect(appointment).not.toContain("spot-row");
    expect(event).not.toContain("spot-row");
    expect(appointment).toContain('data-kind="appointment"');
    expect(event).toContain("18 of 30 sold");
  });

  test("a cancelled class says it was cancelled", () => {
    const html = renderToStaticMarkup(<CalendarBlock kind="group_class" state="cancelled" time="19:00" name="Yoga Flow" status="Cancelled · Coach unwell" />);
    expect(html).toContain('data-state="cancelled"');
    expect(html).toContain("Cancelled · Coach unwell");
  });

  test("without a link it is a plain box that the keyboard cannot reach", () => {
    const html = renderToStaticMarkup(<CalendarBlock kind="group_class" state="open" time="19:00" name="Yoga Flow" status="1 of 12" />);
    expect(html.startsWith("<span")).toBe(true);
    expect(html).not.toContain("tabindex");
  });
});
