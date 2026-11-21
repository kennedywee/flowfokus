import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Icon } from "@/components/ui/icon";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { FormNotice } from "../../components/FormNotice";
import { PageActions } from "../../components/PageActions";
import { useToast } from "../../components/Toast";
import { Kbd } from "../../components/ui";
import { PROGRAM_KIND_LABEL, failureMessage } from "../../lib/format";
import { useAction, useIdempotencyKey } from "../../lib/hooks";
import { useCan, useDeskLocation, useOrganization } from "../../lib/organization";
import { useModKeyLabel, useShortcut } from "../../lib/shortcuts";
import { useWide } from "../../lib/use-wide";
import { createProgram, scheduleProgram, updateProgram } from "../../lib/staff.functions";
import { PROGRAM_KINDS } from "../../lib/validate";
import { DetailHero, DetailLayout, HeroTile, PanelAddGroup, PanelGroup } from "@/components/parts/DetailLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_WEEKS,
  checkDraft,
  checkPlan,
  draftChanged,
  draftFields,
  endClock,
  kindCapacity,
  lengthChoices,
  lengthText,
  planSummary,
  serverField,
  sessionsAdded,
  todayIn,
  type DraftErrors,
  type PlanErrors,
  type ProgramDraft,
} from "./facts";
import { Section } from "../members/Section";
import { KIND_ICON } from "./kinds";
import { usePublishProgram } from "./publish";
import { onlySettingsChanged } from "../settings/sections";
import { useSettings } from "../settings/SettingsDialog";

type Kind = Schemas["ProgramKind"];

const sendNew = (input: Parameters<typeof createProgram>[0]["data"]) => createProgram({ data: input });
const sendEdit = (input: Parameters<typeof updateProgram>[0]["data"]) => updateProgram({ data: input });
const sendSchedule = (input: Parameters<typeof scheduleProgram>[0]["data"]) => scheduleProgram({ data: input });

const icon = { "aria-hidden": true, focusable: false } as const;
const FORM_ID = "program-form";

const KIND_META: Record<Kind, string> = {
  group_class: "Many people, on repeat",
  event: "A few set dates",
  appointment: "One person at a time",
};

/** Weeks to start with for each kind. An event usually happens once. */
const START_WEEKS: Record<Kind, string> = { group_class: "4", event: "1", appointment: "4" };

function focusField(id: string) {
  const field = document.getElementById(id);
  field?.scrollIntoView({ block: "center" });
  field?.focus();
}

/**
 * Paper "New program" and "Edit program": a page, not a dialog. Details on
 * the left; Location, Visibility, and Note on the right. New program also
 * schedules the first sessions: Rails repeats one date and time weekly.
 * ⌘↵ saves. Leaving with changes asks first.
 */
export function ProgramForm({ program }: { program?: Schemas["ProgramDetail"] }) {
  const can = useCan();
  if (!can("programs:manage")) {
    return (
      <FormFrame program={program}>
        <div className="list-state" role="status">
          <p className="list-state__title">Your role cannot change programs.</p>
          <p className="list-state__text">A manager adds and edits programs.</p>
        </div>
      </FormFrame>
    );
  }
  return <Form program={program} />;
}

/**
 * The record frame of a program: orbit dots behind a hero, then the content,
 * with an optional right panel. Below 1100px the panel moves into the page
 * after the hero, so the document order is the order on screen. `actions`
 * goes last for that reason.
 */
function FormFrame({
  program,
  panel,
  actions,
  children,
}: {
  program?: Schemas["ProgramDetail"];
  panel?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const wide = useWide();
  return (
    <DetailLayout record="program" className="program-form" panel={wide ? panel : undefined}>
      <DetailHero tile={<HeroTile icon={program ? KIND_ICON[program.kind] : "programs"} />} title={program ? `Edit ${program.name}` : "New program"} />
      {!wide && panel ? (
        <aside className="detail__panel" aria-label="Location, visibility, and note">
          {panel}
        </aside>
      ) : null}
      {children}
      {actions ? <PageActions>{actions}</PageActions> : null}
    </DetailLayout>
  );
}

function Form({ program }: { program?: Schemas["ProgramDetail"] }) {
  const organization = useOrganization();
  const settings = useSettings();
  const desk = useDeskLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const modKey = useModKeyLabel();
  const publish = usePublishProgram();
  const creating = useAction(sendNew);
  const editing = useAction(sendEdit);
  const scheduling = useAction(sendSchedule);
  // One key per page: a retry after a network error cannot add a second program.
  const [programKey] = useIdempotencyKey();
  const action = program ? editing : creating;
  const pending = action.pending || scheduling.pending;
  const form = useRef<HTMLFormElement>(null);
  const saved = useRef(false);

  const [start] = useState<ProgramDraft>(() => ({
    name: program?.name ?? "",
    kind: program?.kind ?? "group_class",
    locationId: program?.location_id ?? desk?.id ?? organization.locations[0]?.id ?? "",
    host: program?.host_name ?? "",
    duration: String(program?.duration_minutes ?? 60),
    capacity: String(program?.capacity ?? 12),
    description: program?.description ?? "",
    published: program?.published ?? false,
  }));
  const [draft, setDraft] = useState<ProgramDraft>(start);
  const [noteOpen, setNoteOpen] = useState(start.description !== "");
  const [plan, setPlan] = useState({ date: todayIn(organization.timezone), time: "18:30", weeks: START_WEEKS.group_class });
  const [planTouched, setPlanTouched] = useState(false);
  const [local, setLocal] = useState<DraftErrors & PlanErrors>({});

  const set = <K extends keyof ProgramDraft>(key: K, value: ProgramDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setPlanField = (key: keyof typeof plan, value: string) => {
    setPlan((current) => ({ ...current, [key]: value }));
    setPlanTouched(true);
  };

  const dirty = draftChanged(draft, start, planTouched);
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) => dirty && !saved.current && !onlySettingsChanged(current, next),
    enableBeforeUnload: () => dirty && !saved.current,
    withResolver: true,
  });
  useShortcut("Enter", () => form.current?.requestSubmit(), { mod: true, enabled: !pending && blocker.status !== "blocked" });

  const server = action.error?.code === "validation_failed" ? action.error.details : undefined;
  const errors = {
    name: local.name ?? serverField(server?.name, "Name"),
    location: local.location ?? serverField(server?.location_id, "Location"),
    duration: local.duration ?? serverField(server?.duration_minutes, "Length"),
    capacity: local.capacity ?? serverField(server?.capacity, "Spots"),
    host: serverField(server?.host_name, "Host"),
    description: serverField(server?.description, "Note"),
    date: local.date,
    time: local.time,
    weeks: local.weeks,
  };
  const weeks = Number(plan.weeks);
  const summary = weeks > 0 ? planSummary({ date: plan.date, time: plan.time, weeks }) : null;

  function chooseKind(kind: Kind) {
    setDraft((current) => ({ ...current, kind, capacity: kindCapacity(kind, current.kind === "appointment" ? start.capacity : current.capacity) }));
    if (!planTouched) setPlan((current) => ({ ...current, weeks: START_WEEKS[kind] }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const found: DraftErrors & PlanErrors = { ...checkDraft(draft), ...(!program && weeks > 0 ? checkPlan(plan) : {}) };
    setLocal(found);
    const order = ["name", "capacity", "duration", "location", "time", "date", "weeks"] as const;
    const firstError = order.find((key) => found[key]);
    if (firstError) {
      focusField(`program-${firstError}`);
      return;
    }

    if (program) {
      const result = await editing.run({ slug: organization.slug, id: program.id, ...draftFields(draft) });
      if (!result.ok) return;
      saved.current = true;
      toast.show({ tone: "success", title: "Program saved", body: "New sessions use these details. Existing sessions keep their spots." });
      void navigate({ to: "/$org/programs/$programId", params: { org: organization.slug, programId: program.id }, replace: true });
      return;
    }

    const result = await creating.run({ slug: organization.slug, idempotencyKey: programKey, kind: draft.kind, ...draftFields(draft) });
    if (!result.ok) return;
    const created = result.data;
    saved.current = true;
    if (weeks > 0) {
      // The program exists now. A failed schedule leaves it, so staff never create it twice.
      const scheduled = await scheduling.run({ slug: organization.slug, id: created.id, date: plan.date, time: plan.time, weeks });
      if (!scheduled.ok) {
        toast.show({
          tone: "error",
          title: "Program created. No sessions were added",
          body: `${failureMessage(scheduled.error)} Add sessions from the program page.`,
        });
      } else {
        const added = sessionsAdded(scheduled.data.occurrences.length, weeks, created.capacity);
        createdToast(created, added.title);
      }
    } else {
      createdToast(created);
    }
    // Replace this form in history, so Back returns to the list.
    void navigate({ to: "/$org/programs/$programId", params: { org: organization.slug, programId: created.id }, replace: true });
  }

  function createdToast(created: Schemas["ProgramDetail"], sessions?: string) {
    const facts = [sessions, created.published ? "Members can book it online" : "Members can't see it yet"].filter(Boolean).join(" · ");
    toast.show({
      tone: "success",
      title: "Program created",
      body: facts,
      ...(created.published ? {} : { action: { label: "Publish", onClick: () => void publish(created.id, true) } }),
    });
  }

  const submitLabel = program ? "Save changes" : "Create program";
  const lengths = lengthChoices(Number(draft.duration));
  const failed = action.error && action.error.code !== "validation_failed" ? action.error : null;
  const anyFieldError = Object.values(errors).some(Boolean);

  const panel = (
    <>
      <div className="panel-group">
        <FieldBox id="program-location" label="Location" error={errors.location}>
          <span className="program-select">
            <Icon name="location" className="program-select__icon" {...icon} />
            <NativeSelect
              id="program-location"
              className="program-input program-select__control"
              value={draft.locationId}
              onChange={(event) => set("locationId", event.target.value)}
              aria-invalid={errors.location ? true : undefined}
              aria-describedby={errors.location ? "program-location-error" : undefined}
            >
              {organization.locations.length ? null : <NativeSelectOption value="">No locations</NativeSelectOption>}
              {organization.locations.map((location) => (
                <NativeSelectOption key={location.id} value={location.id}>
                  {location.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </span>
          {organization.locations.length ? null : (
            <button type="button" className="program-form__link" onClick={() => settings.open("locations")}>
              Add a location
            </button>
          )}
        </FieldBox>
      </div>
      <div className="panel-group">
        <FieldBox id="program-visibility" label="Visibility">
          <span className="program-select">
            {draft.published ? <Icon name="gymSite" className="program-select__icon" {...icon} /> : <Icon name="visibility" className="program-select__icon" {...icon} />}
            <NativeSelect
              id="program-visibility"
              className="program-input program-select__control"
              value={draft.published ? "published" : "staff_only"}
              onChange={(event) => set("published", event.target.value === "published")}
            >
              <NativeSelectOption value="staff_only">Staff only</NativeSelectOption>
              <NativeSelectOption value="published">Published</NativeSelectOption>
            </NativeSelect>
          </span>
        </FieldBox>
      </div>
      {noteOpen ? (
        <div className="panel-group">
          <FieldBox id="program-note" label="Note" error={errors.description}>
            <Textarea
              id="program-note"
              className="program-input program-input--note"
              rows={3}
              maxLength={2000}
              value={draft.description}
              onChange={(event) => set("description", event.target.value)}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={errors.description ? "program-note-error" : undefined}
            />
          </FieldBox>
        </div>
      ) : (
        <PanelAddGroup
          title="Note"
          addLabel="Add a note"
          onAdd={() => {
            setNoteOpen(true);
            requestAnimationFrame(() => document.getElementById("program-note")?.focus());
          }}
        >
          <p className="program-form__no-note">No note</p>
        </PanelAddGroup>
      )}
    </>
  );

  return (
    <FormFrame
      program={program}
      panel={panel}
      actions={
        <Button
          type="submit"
          form={FORM_ID}
          size="compact"
          className="program-form__submit"
          disabled={pending}
          aria-busy={pending || undefined}
          aria-keyshortcuts="Meta+Enter Control+Enter"
        >
          {pending ? (
            <>
              <span className="spinner" aria-hidden="true" />
              {program ? "Saving…" : "Creating…"}
            </>
          ) : (
            <>
              {submitLabel}
              <Kbd>{modKey}↵</Kbd>
            </>
          )}
        </Button>
      }
    >
      <form id={FORM_ID} ref={form} className="program-form__form" onSubmit={onSubmit} noValidate>
        {failed ? (
          <FormNotice title={program ? "The changes were not saved" : "The program was not saved"} error={failed} after="Your details are kept." />
        ) : anyFieldError ? (
          <p className="visually-hidden" role="alert">
            {program ? "The changes were not saved." : "The program was not created."} Fix the marked fields.
          </p>
        ) : null}

        <Section id="program-details" title="Details">
          <div className="program-form__fields">
            <FieldBox id="program-name" label="Name" error={errors.name} wide>
              <Input
                id="program-name"
                className="program-input"
                autoFocus
                autoComplete="off"
                maxLength={200}
                value={draft.name}
                onChange={(event) => set("name", event.target.value)}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "program-name-error" : undefined}
              />
            </FieldBox>

            {program ? null : (
              <fieldset className="program-kinds">
                <legend className="program-field__label">Kind</legend>
                <div className="program-kinds__cards">
                  {PROGRAM_KINDS.map((kind) => {
                    const iconName = KIND_ICON[kind];
                    return (
                      <label key={kind} className="program-kind">
                        <input
                          type="radio"
                          name="program-kind"
                          className="program-kind__input"
                          value={kind}
                          checked={draft.kind === kind}
                          onChange={() => chooseKind(kind)}
                        />
                        <Icon name={iconName} className="program-kind__icon" {...icon} />
                        <span className="program-kind__title">{PROGRAM_KIND_LABEL[kind]}</span>
                        <span className="program-kind__meta">{KIND_META[kind]}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div className="program-form__row">
              <FieldBox id="program-host" label="Host" optional error={errors.host}>
                <Input
                  id="program-host"
                  className="program-input"
                  autoComplete="off"
                  maxLength={200}
                  placeholder="Coach or host"
                  value={draft.host}
                  onChange={(event) => set("host", event.target.value)}
                  aria-invalid={errors.host ? true : undefined}
                  aria-describedby={errors.host ? "program-host-error" : undefined}
                />
              </FieldBox>
              <FieldBox id="program-duration" label="Length" error={errors.duration}>
                <NativeSelect
                  id="program-duration"
                  className="program-input"
                  value={draft.duration}
                  onChange={(event) => set("duration", event.target.value)}
                  aria-invalid={errors.duration ? true : undefined}
                  aria-describedby={errors.duration ? "program-duration-error" : undefined}
                >
                  {lengths.map((minutes) => (
                    <NativeSelectOption key={minutes} value={String(minutes)}>
                      {lengthText(minutes)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FieldBox>
              <FieldBox id="program-capacity" label="Spots" error={errors.capacity}>
                <span className="program-input program-input--suffix" data-invalid={errors.capacity ? true : undefined}>
                  <input
                    id="program-capacity"
                    className="program-input__bare"
                    inputMode="numeric"
                    autoComplete="off"
                    value={draft.capacity}
                    onChange={(event) => set("capacity", event.target.value)}
                    aria-invalid={errors.capacity ? true : undefined}
                    aria-describedby={errors.capacity ? "program-capacity-error program-capacity-unit" : "program-capacity-unit"}
                  />
                  <span id="program-capacity-unit" className="program-input__unit">
                    per session
                  </span>
                </span>
              </FieldBox>
            </div>
          </div>
        </Section>

        {program ? null : (
          <Section id="program-schedule" title="Schedule">
            <div className="program-form__fields">
              <div className="program-form__row program-form__row--schedule">
                <FieldBox id="program-time" label="Starts at" error={errors.time}>
                  <span className="program-input program-input--suffix" data-invalid={errors.time ? true : undefined}>
                    <input
                      id="program-time"
                      type="time"
                      step={300}
                      className="program-input__bare"
                      value={plan.time}
                      disabled={weeks === 0}
                      onChange={(event) => setPlanField("time", event.target.value)}
                      aria-invalid={errors.time ? true : undefined}
                      aria-describedby={errors.time ? "program-time-error" : undefined}
                    />
                    <span className="program-input__unit">to {endClock(plan.time, Number(draft.duration) || 0)}</span>
                  </span>
                </FieldBox>
                <FieldBox id="program-date" label="From" error={errors.date}>
                  <Input
                    id="program-date"
                    type="date"
                    className="program-input"
                    value={plan.date}
                    disabled={weeks === 0}
                    onChange={(event) => setPlanField("date", event.target.value)}
                    aria-invalid={errors.date ? true : undefined}
                    aria-describedby={errors.date ? "program-date-error" : undefined}
                  />
                </FieldBox>
                <FieldBox id="program-weeks" label="Repeat weekly for" error={errors.weeks}>
                  <NativeSelect
                    id="program-weeks"
                    className="program-input"
                    value={plan.weeks}
                    onChange={(event) => setPlanField("weeks", event.target.value)}
                  >
                    <NativeSelectOption value="0">No sessions yet</NativeSelectOption>
                    {Array.from({ length: MAX_WEEKS }, (_, index) => (
                      <NativeSelectOption key={index} value={String(index + 1)}>
                        {index === 0 ? "1 week" : `${index + 1} weeks`}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </FieldBox>
              </div>
              <p className="program-form__summary" aria-live="polite">
                {summary ? (
                  <>
                    <span className="program-form__summary-count">{summary.count}</span>
                    <span className="program-form__summary-detail">{summary.detail}</span>
                  </>
                ) : (
                  <span className="program-form__summary-detail">No sessions yet</span>
                )}
              </p>
            </div>
          </Section>
        )}
      </form>

      <ConfirmDialog
        open={blocker.status === "blocked"}
        tone="critical"
        title={program ? "Discard these changes?" : "Discard this program?"}
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      >
        <p>{program ? `Your changes to ${program.name} will be lost.` : `The details you entered${draft.name.trim() ? ` for ${draft.name.trim()}` : ""} will be lost.`}</p>
      </ConfirmDialog>
    </FormFrame>
  );
}

/** A label above the control and a one-line error under it, as in Paper "6 · Missing details". */
function FieldBox({
  id,
  label,
  optional = false,
  error,
  wide = false,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="program-field" data-wide={wide || undefined}>
      <label className="program-field__label" htmlFor={id}>
        {label}
        {optional ? <span className="program-field__optional"> Optional</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="program-field__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
