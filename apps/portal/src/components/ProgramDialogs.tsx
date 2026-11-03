import { useState, type FormEvent } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { useToast } from "./Toast";
import { Field, FailureNotice, Notice, SubmitButton, describedBy } from "./ui";
import { PROGRAM_KIND_LABEL, currencyDigits, formatMoney, parseAmountToMinor } from "../lib/format";
import { useAction } from "../lib/hooks";
import { useDeskLocation, useOrganization } from "../lib/organization";
import { addTicket, createProgram, scheduleProgram, updateProgram } from "../lib/staff.functions";
import { PROGRAM_KINDS } from "../lib/validate";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogTitle, useRestoreFocus } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const sendNewProgram = (input: Parameters<typeof createProgram>[0]["data"]) => createProgram({ data: input });
const sendProgramChange = (input: Parameters<typeof updateProgram>[0]["data"]) => updateProgram({ data: input });
const sendSchedule = (input: Parameters<typeof scheduleProgram>[0]["data"]) => scheduleProgram({ data: input });
const sendTicket = (input: Parameters<typeof addTicket>[0]["data"]) => addTicket({ data: input });

const KIND_HINT: Record<Schemas["ProgramKind"], string> = {
  group_class: "A class that repeats, such as Yoga Flow every Tuesday.",
  event: "A one-off date, such as a seminar or a competition.",
  appointment: "One-to-one slots, such as personal training. Capacity is usually 1.",
};

function serverMessages(details?: Record<string, string[]>): string[] {
  if (!details) return [];
  return Object.entries(details).map(([field, messages]) => `${field.replace(/_/g, " ")} ${messages.join(", ")}`);
}

function Problems({ title, problems }: { title: string; problems: string[] }) {
  return (
    <Notice tone="error" title={title} live>
      <ul className="offer-dialog__problems">
        {problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
    </Notice>
  );
}

/** Adds a program, or edits one. The kind is fixed once saved. */
export function ProgramDialog({ program, onClose }: { program?: Schemas["ProgramDetail"]; onClose: () => void }) {
  useRestoreFocus();
  const organization = useOrganization();
  const desk = useDeskLocation();
  const router = useRouter();
  const navigate = useNavigate();
  const toast = useToast();
  const creating = useAction(sendNewProgram);
  const editing = useAction(sendProgramChange);
  const action = program ? editing : creating;
  const [name, setName] = useState(program?.name ?? "");
  const [kind, setKind] = useState<Schemas["ProgramKind"]>(program?.kind ?? "group_class");
  const [locationId, setLocationId] = useState(program?.location_id ?? desk?.id ?? organization.locations[0]?.id ?? "");
  const [capacity, setCapacity] = useState(String(program?.capacity ?? 12));
  const [duration, setDuration] = useState(String(program?.duration_minutes ?? 60));
  const [host, setHost] = useState(program?.host_name ?? "");
  const [description, setDescription] = useState(program?.description ?? "");
  const [published, setPublished] = useState(program?.published ?? true);
  const [problems, setProblems] = useState<string[]>([]);

  function chooseKind(next: Schemas["ProgramKind"]) {
    setKind(next);
    if (!program && next === "appointment") setCapacity("1");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: string[] = [];
    if (!name.trim()) found.push("Enter a name, for example Yoga Flow.");
    if (!locationId) found.push("Choose where it happens.");
    if (!/^\d{1,5}$/.test(capacity.trim()) || Number(capacity) < 1 || Number(capacity) > 10000) {
      found.push("Spots must be a whole number from 1 to 10000.");
    }
    if (!/^\d{1,4}$/.test(duration.trim()) || Number(duration) < 1 || Number(duration) > 1440) {
      found.push("Length must be from 1 to 1440 minutes.");
    }
    setProblems(found);
    if (found.length) return;

    const fields = {
      slug: organization.slug,
      name: name.trim(),
      description: description.trim() || null,
      location_id: locationId,
      capacity: Number(capacity),
      duration_minutes: Number(duration),
      host_name: host.trim() || null,
      published,
    };
    const result = program ? await editing.run({ ...fields, id: program.id }) : await creating.run({ ...fields, kind });
    if (!result.ok) return;
    toast.show({
      tone: "success",
      title: program ? "Program saved" : "Program added",
      body: program ? "New times use these details. Existing times keep their spots." : "Add times and a ticket price next.",
    });
    onClose();
    if (program) {
      void router.invalidate();
    } else {
      void navigate({ to: "/$org/programs/$programId", params: { org: organization.slug, programId: result.data.id } });
    }
  }

  const server = action.error?.code === "validation_failed" ? serverMessages(action.error.details) : [];

  return (
    <Dialog open onOpenChange={(open) => !open && !action.pending && onClose()}>
      <DialogContent className="offer-dialog">
        <form onSubmit={onSubmit} noValidate>
          <DialogBody>
            <DialogTitle>{program ? `Edit ${program.name}` : "Add program"}</DialogTitle>
            {problems.length || server.length ? (
              <Problems title="The program was not saved" problems={[...problems, ...server]} />
            ) : action.error ? (
              <FailureNotice error={action.error} title="The program was not saved" />
            ) : null}
            <div className="form">
              <Field id="program-name" label="Name">
                <Input id="program-name" value={name} maxLength={200} autoFocus onChange={(event) => setName(event.target.value)} />
              </Field>
              {program ? null : (
                <Field id="program-kind" label="Kind" hint={KIND_HINT[kind]}>
                  <NativeSelect
                    id="program-kind"
                    value={kind}
                    aria-describedby={describedBy("program-kind", "hint")}
                    onChange={(event) => chooseKind(event.target.value as Schemas["ProgramKind"])}
                  >
                    {PROGRAM_KINDS.map((value) => (
                      <NativeSelectOption key={value} value={value}>
                        {PROGRAM_KIND_LABEL[value]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              )}
              <div className="form-row">
                <Field id="program-capacity" label="Spots per time">
                  <Input id="program-capacity" inputMode="numeric" value={capacity} onChange={(event) => setCapacity(event.target.value)} />
                </Field>
                <Field id="program-duration" label="Length in minutes">
                  <Input id="program-duration" inputMode="numeric" value={duration} onChange={(event) => setDuration(event.target.value)} />
                </Field>
              </div>
              <div className="form-row">
                <Field id="program-location" label="Location">
                  <NativeSelect id="program-location" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                    {organization.locations.map((location) => (
                      <NativeSelectOption key={location.id} value={location.id}>
                        {location.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field id="program-host" label="Coach or host" hint="Optional. Members see this name.">
                  <Input
                    id="program-host"
                    value={host}
                    maxLength={200}
                    aria-describedby={describedBy("program-host", "hint")}
                    onChange={(event) => setHost(event.target.value)}
                  />
                </Field>
              </div>
              <Field id="program-description" label="Description" hint="Optional. Shown on the gym site.">
                <Textarea
                  id="program-description"
                  rows={3}
                  maxLength={2000}
                  value={description}
                  aria-describedby={describedBy("program-description", "hint")}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
              <div className="offer-dialog__switch">
                <Switch id="program-published" checked={published} onCheckedChange={(value) => setPublished(value)} />
                <label htmlFor="program-published">Show on the gym site schedule</label>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={action.pending}>
              Cancel
            </Button>
            <SubmitButton pending={action.pending} pendingLabel="Saving…">
              {program ? "Save program" : "Add program"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Today in the gym's time zone, as YYYY-MM-DD. */
function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" }).format(new Date());
}

/** Adds one time, or the same day and time for several weeks. */
export function ScheduleDialog({ program, onClose }: { program: Schemas["ProgramDetail"]; onClose: () => void }) {
  useRestoreFocus();
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendSchedule);
  const [date, setDate] = useState(() => todayIn(organization.timezone));
  const [time, setTime] = useState("19:00");
  const [weeks, setWeeks] = useState(program.kind === "event" ? "1" : "4");
  const [problems, setProblems] = useState<string[]>([]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: string[] = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) found.push("Choose the first date.");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) found.push("Choose a start time.");
    if (!/^\d{1,2}$/.test(weeks) || Number(weeks) < 1 || Number(weeks) > 26) found.push("Repeat for 1 to 26 weeks.");
    setProblems(found);
    if (found.length) return;

    const before = program.occurrences.length;
    const result = await action.run({ slug: organization.slug, id: program.id, date, time, weeks: Number(weeks) });
    if (!result.ok) return;
    const added = result.data.occurrences.length - before;
    toast.show({
      tone: "success",
      title: added === 1 ? "1 time added" : `${Math.max(added, 0)} times added`,
      body: added < Number(weeks) ? "Times that already existed were skipped." : `Each time has ${program.capacity} spots.`,
    });
    void router.invalidate();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !action.pending && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody>
            <DialogTitle>Add times to {program.name}</DialogTitle>
            {problems.length ? <Problems title="No times were added" problems={problems} /> : null}
            {action.error ? <FailureNotice error={action.error} title="No times were added" /> : null}
            <div className="form">
              <div className="form-row">
                <Field id="schedule-date" label="First date">
                  <Input id="schedule-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} autoFocus />
                </Field>
                <Field id="schedule-time" label="Start time">
                  <Input id="schedule-time" type="time" value={time} step={300} onChange={(event) => setTime(event.target.value)} />
                </Field>
              </div>
              <Field id="schedule-weeks" label="Repeat weekly for" hint="1 adds a single time. Times are in the gym's time zone.">
                <NativeSelect
                  id="schedule-weeks"
                  value={weeks}
                  aria-describedby={describedBy("schedule-weeks", "hint")}
                  onChange={(event) => setWeeks(event.target.value)}
                >
                  {[1, 2, 4, 8, 12, 26].map((count) => (
                    <NativeSelectOption key={count} value={String(count)}>
                      {count === 1 ? "1 week (one time)" : `${count} weeks`}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={action.pending}>
              Cancel
            </Button>
            <SubmitButton pending={action.pending} pendingLabel="Adding…">
              Add times
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Adds a ticket price. A ticket buys one spot at one time. */
export function TicketDialog({ program, onClose }: { program: Schemas["ProgramDetail"]; onClose: () => void }) {
  useRestoreFocus();
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendTicket);
  const currency = organization.currency;
  const [label, setLabel] = useState(program.ticket ? "" : program.kind === "appointment" ? "Single session" : "Drop-in");
  const [amount, setAmount] = useState("");
  const [local, setLocal] = useState<{ label?: string; amount?: string }>({});
  const server = action.error?.code === "validation_failed" ? action.error.details : undefined;
  const amountMinor = parseAmountToMinor(amount, currency);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: typeof local = {};
    if (!label.trim()) errors.label = "Enter a label, for example Drop-in or Early bird.";
    if (amountMinor === null) {
      errors.amount = currencyDigits(currency) > 0 ? "Enter an amount, for example 25 or 25.50." : "Enter a whole amount.";
    }
    setLocal(errors);
    if (errors.label || errors.amount || amountMinor === null) return;

    const result = await action.run({ slug: organization.slug, id: program.id, label: label.trim(), amount_minor: amountMinor });
    if (result.ok) {
      toast.show({ tone: "success", title: "Ticket price added", body: `${label.trim()} is on sale for ${program.name}.` });
      void router.invalidate();
      onClose();
    }
  }

  const labelError = local.label ?? server?.label?.join(" ");
  const amountError = local.amount ?? server?.amount_minor?.join(" ");
  return (
    <Dialog open onOpenChange={(open) => !open && !action.pending && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody>
            <DialogTitle>Add a ticket price to {program.name}</DialogTitle>
            {action.error && action.error.code !== "validation_failed" ? (
              <FailureNotice error={action.error} title="The ticket price was not added" />
            ) : null}
            <div className="form">
              <Field id="ticket-label" label="Label" error={labelError}>
                <Input
                  id="ticket-label"
                  value={label}
                  maxLength={200}
                  autoFocus
                  aria-invalid={labelError ? true : undefined}
                  aria-describedby={describedBy("ticket-label", undefined, labelError)}
                  onChange={(event) => setLabel(event.target.value)}
                />
              </Field>
              <Field id="ticket-amount" label={`Amount (${currency})`} error={amountError}>
                <Input
                  id="ticket-amount"
                  inputMode="decimal"
                  value={amount}
                  aria-invalid={amountError ? true : undefined}
                  aria-describedby={describedBy("ticket-amount", undefined, amountError)}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </Field>
              <Notice tone="info" title="One ticket, one spot">
                <p>
                  {amountMinor !== null ? `${formatMoney(amountMinor, currency)} buys one spot at one time. ` : "A ticket buys one spot at one time. "}
                  Members can buy it on the gym site when they book. The amount is fixed once saved.
                </p>
              </Notice>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={action.pending}>
              Cancel
            </Button>
            <SubmitButton pending={action.pending} pendingLabel="Adding…">
              Add ticket price
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
