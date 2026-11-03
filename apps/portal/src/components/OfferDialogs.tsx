import { useState, type FormEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "./Toast";
import { Field, FailureNotice, Notice, SubmitButton, describedBy } from "./ui";
import { PROGRAM_KIND_PLURAL, currencyDigits, formatDuration, formatMoney, parseAmountToMinor } from "../lib/format";
import { useAction } from "../lib/hooks";
import { useOrganization } from "../lib/organization";
import { createPrice, createProduct, updateProduct } from "../lib/staff.functions";
import { PROGRAM_KINDS } from "../lib/validate";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogTitle, useRestoreFocus } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const sendNewProduct = (input: Parameters<typeof createProduct>[0]["data"]) => createProduct({ data: input });
const sendProductChange = (input: Parameters<typeof updateProduct>[0]["data"]) => updateProduct({ data: input });
const sendPrice = (input: Parameters<typeof createPrice>[0]["data"]) => createPrice({ data: input });

/** Which programs a program benefit covers: every program, one kind, or a picked list. */
type Scope = "all" | Schemas["ProgramKind"] | "selected";

interface BenefitDraft {
  key: number;
  kind: Schemas["BenefitKind"];
  name: string;
  usage: string;
  locationId: string;
  scope: Scope;
  programIds: string[];
}

let nextKey = 1;

function draftOf(benefit?: Schemas["Benefit"]): BenefitDraft {
  return {
    key: nextKey++,
    kind: benefit?.kind ?? "gym_access",
    name: benefit?.name ?? "Gym access",
    usage: benefit?.usage_limit ? String(benefit.usage_limit) : "",
    locationId: benefit?.location_id ?? "",
    scope: benefit?.program_ids.length ? "selected" : (benefit?.program_kind ?? "all"),
    programIds: benefit?.program_ids ?? [],
  };
}

function classesDraft(): BenefitDraft {
  return { ...draftOf(), kind: "program_access", name: "Group classes", usage: "10", scope: "group_class" };
}

/** Messages from Rails `validation_failed`, one line per field. */
function serverMessages(details?: Record<string, string[]>): string[] {
  if (!details) return [];
  return Object.entries(details).map(([field, messages]) => `${field.replace(/^benefits\./, "Benefit ").replace(/_/g, " ")} ${messages.join(", ")}`);
}

/**
 * Creates a membership product, or edits one. Benefits are templates: a change
 * applies to new sales only. Past sales keep their terms.
 */
export function ProductDialog({
  product,
  programs,
  onClose,
}: {
  product?: Schemas["StaffProduct"];
  /** Programs a program benefit can name. */
  programs: Schemas["ProgramListItem"][];
  onClose: () => void;
}) {
  useRestoreFocus();
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const creating = useAction(sendNewProduct);
  const editing = useAction(sendProductChange);
  const action = product ? editing : creating;
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [published, setPublished] = useState(product?.published ?? false);
  const [kind, setKind] = useState<"membership" | "pass">(product?.kind === "pass" ? "pass" : "membership");
  const [benefits, setBenefits] = useState<BenefitDraft[]>(() =>
    product?.benefits.length ? product.benefits.map(draftOf) : [draftOf()],
  );

  /** A new pass starts with a class benefit; a new membership with gym access. */
  function chooseKind(next: "membership" | "pass") {
    setKind(next);
    if (!product) setBenefits([next === "pass" ? classesDraft() : draftOf()]);
  }
  const [problems, setProblems] = useState<string[]>([]);

  function changeBenefit(key: number, change: Partial<BenefitDraft>) {
    setBenefits((list) => list.map((item) => (item.key === key ? { ...item, ...change } : item)));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: string[] = [];
    if (!name.trim()) found.push("Enter a name for the offer.");
    if (!benefits.length) found.push("Add at least one benefit.");
    benefits.forEach((benefit, index) => {
      if (!benefit.name.trim()) found.push(`Enter a name for benefit ${index + 1}.`);
      if (benefit.usage.trim() && !/^[1-9]\d{0,5}$/.test(benefit.usage.trim())) {
        found.push(`Uses for benefit ${index + 1} must be a whole number above zero, or empty for unlimited.`);
      }
      if (benefit.kind === "program_access" && benefit.scope === "selected" && !benefit.programIds.length) {
        found.push(`Pick at least one program for benefit ${index + 1}.`);
      }
    });
    setProblems(found);
    if (found.length) return;

    const fields = {
      slug: organization.slug,
      name: name.trim(),
      description: description.trim() || null,
      published,
      benefits: benefits.map((benefit) => {
        const program = benefit.kind === "program_access";
        return {
          kind: benefit.kind,
          name: benefit.name.trim(),
          usage_limit: benefit.usage.trim() ? Number(benefit.usage.trim()) : null,
          location_id: benefit.locationId || null,
          program_ids: program && benefit.scope === "selected" ? benefit.programIds : [],
          program_kind: program && benefit.scope !== "all" && benefit.scope !== "selected" ? benefit.scope : null,
        };
      }),
    };
    const result = product ? await editing.run({ ...fields, id: product.id }) : await creating.run({ ...fields, kind });
    if (result.ok) {
      toast.show({
        tone: "success",
        title: product ? "Offer saved" : "Offer added",
        body: product ? "New sales use these details. Past sales keep theirs." : "Add a price so staff can sell it.",
      });
      void router.invalidate();
      onClose();
    }
  }

  const server = action.error?.code === "validation_failed" ? serverMessages(action.error.details) : [];

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !action.pending) onClose();
      }}
    >
      <DialogContent className="offer-dialog">
        <form onSubmit={onSubmit} noValidate>
          <DialogBody>
            <DialogTitle>{product ? `Edit ${product.name}` : kind === "pass" ? "Add pass" : "Add membership"}</DialogTitle>
            {problems.length || server.length ? (
              <Notice tone="error" title={product ? "The offer was not saved" : "The offer was not added"} live>
                <ul className="offer-dialog__problems">
                  {[...problems, ...server].map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              </Notice>
            ) : action.error ? (
              <FailureNotice error={action.error} title="The offer was not saved" />
            ) : null}
            <div className="form">
              {product ? null : (
                <Field
                  id="offer-kind"
                  label="Kind"
                  hint={
                    kind === "pass"
                      ? "A pass is bought once and used across programs, for example 10 classes in 60 days."
                      : "A membership runs for a term and can be renewed. It can include classes too."
                  }
                >
                  <NativeSelect
                    id="offer-kind"
                    value={kind}
                    aria-describedby={describedBy("offer-kind", "hint")}
                    onChange={(event) => chooseKind(event.target.value as "membership" | "pass")}
                  >
                    <NativeSelectOption value="membership">Membership</NativeSelectOption>
                    <NativeSelectOption value="pass">Pass</NativeSelectOption>
                  </NativeSelect>
                </Field>
              )}
              <Field id="offer-name" label="Name">
                <Input id="offer-name" value={name} maxLength={200} onChange={(event) => setName(event.target.value)} autoFocus />
              </Field>
              <Field id="offer-description" label="Description" hint="Optional. Shown on the gym site when published.">
                <Textarea
                  id="offer-description"
                  value={description}
                  maxLength={2000}
                  rows={3}
                  aria-describedby={describedBy("offer-description", "hint")}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
              <div className="offer-dialog__switch">
                <Switch id="offer-published" checked={published} onCheckedChange={(value) => setPublished(value)} />
                <label htmlFor="offer-published">Show on the gym site</label>
              </div>
              <fieldset className="offer-dialog__benefits">
                <legend>Benefits</legend>
                <p className="field__hint">
                  Each sale copies these benefits. Gym access opens the gym at check-in. Program bookings book classes, events,
                  or appointments. Leave uses empty for unlimited.
                </p>
                {benefits.map((benefit, index) => (
                  <div key={benefit.key} className="offer-dialog__benefit">
                    <Field id={`benefit-name-${benefit.key}`} label={`Benefit ${index + 1}`}>
                      <Input
                        id={`benefit-name-${benefit.key}`}
                        value={benefit.name}
                        maxLength={200}
                        onChange={(event) => changeBenefit(benefit.key, { name: event.target.value })}
                      />
                    </Field>
                    <Field id={`benefit-kind-${benefit.key}`} label="Gives">
                      <NativeSelect
                        id={`benefit-kind-${benefit.key}`}
                        value={benefit.kind}
                        onChange={(event) => changeBenefit(benefit.key, { kind: event.target.value as Schemas["BenefitKind"] })}
                      >
                        <NativeSelectOption value="gym_access">Gym access</NativeSelectOption>
                        <NativeSelectOption value="program_access">Program bookings</NativeSelectOption>
                      </NativeSelect>
                    </Field>
                    <Field id={`benefit-usage-${benefit.key}`} label={benefit.kind === "gym_access" ? "Visits per period" : "Bookings"}>
                      <Input
                        id={`benefit-usage-${benefit.key}`}
                        inputMode="numeric"
                        placeholder="Unlimited"
                        value={benefit.usage}
                        onChange={(event) => changeBenefit(benefit.key, { usage: event.target.value })}
                      />
                    </Field>
                    <Field id={`benefit-location-${benefit.key}`} label="Location">
                      <NativeSelect
                        id={`benefit-location-${benefit.key}`}
                        value={benefit.locationId}
                        onChange={(event) => changeBenefit(benefit.key, { locationId: event.target.value })}
                      >
                        <NativeSelectOption value="">All locations</NativeSelectOption>
                        {organization.locations.map((location) => (
                          <NativeSelectOption key={location.id} value={location.id}>
                            {location.name}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                    {benefit.kind === "program_access" ? (
                      <ProgramScopeField benefit={benefit} programs={programs} onChange={(change) => changeBenefit(benefit.key, change)} />
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="offer-dialog__remove"
                      aria-label={`Remove benefit ${index + 1}`}
                      disabled={benefits.length === 1}
                      onClick={() => setBenefits((list) => list.filter((item) => item.key !== benefit.key))}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                {benefits.length < 10 ? (
                  <Button type="button" variant="secondary" size="sm" onClick={() => setBenefits((list) => [...list, draftOf()])}>
                    <Plus aria-hidden="true" />
                    Add benefit
                  </Button>
                ) : null}
              </fieldset>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={action.pending}>
              Cancel
            </Button>
            <SubmitButton pending={action.pending} pendingLabel="Saving…">
              {product ? "Save offer" : kind === "pass" ? "Add pass" : "Add membership"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Which programs a program benefit books: every program, one kind, or a picked list. */
function ProgramScopeField({
  benefit,
  programs,
  onChange,
}: {
  benefit: BenefitDraft;
  programs: Schemas["ProgramListItem"][];
  onChange: (change: Partial<BenefitDraft>) => void;
}) {
  const id = `benefit-scope-${benefit.key}`;
  return (
    <div className="offer-dialog__scope">
      <Field id={id} label="Programs">
        <NativeSelect id={id} value={benefit.scope} onChange={(event) => onChange({ scope: event.target.value as Scope })}>
          <NativeSelectOption value="all">Every program</NativeSelectOption>
          {PROGRAM_KINDS.map((value) => (
            <NativeSelectOption key={value} value={value}>
              All {PROGRAM_KIND_PLURAL[value]}
            </NativeSelectOption>
          ))}
          <NativeSelectOption value="selected" disabled={!programs.length}>
            Selected programs
          </NativeSelectOption>
        </NativeSelect>
      </Field>
      {benefit.scope === "selected" ? (
        <fieldset className="offer-dialog__programs">
          <legend className="visually-hidden">Programs this benefit books</legend>
          {programs.map((program) => {
            const checked = benefit.programIds.includes(program.id);
            return (
              <label key={program.id} className="offer-dialog__program">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) =>
                    onChange({
                      programIds: value === true ? [...benefit.programIds, program.id] : benefit.programIds.filter((item) => item !== program.id),
                    })
                  }
                />
                {program.name}
              </label>
            );
          })}
        </fieldset>
      ) : null}
    </div>
  );
}

/** Adds a price. Amount and term are fixed once saved. */
export function PriceDialog({ product, onClose }: { product: Schemas["StaffProduct"]; onClose: () => void }) {
  useRestoreFocus();
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendPrice);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("30");
  const [local, setLocal] = useState<{ label?: string; amount?: string; days?: string }>({});
  const currency = organization.currency;

  const server = action.error?.code === "validation_failed" ? action.error.details : undefined;
  const labelError = local.label ?? server?.label?.join(" ");
  const amountError = local.amount ?? server?.amount_minor?.join(" ");
  const daysError = local.days ?? server?.duration_days?.join(" ");
  const amountMinor = parseAmountToMinor(amount, currency);
  const term = Number(days);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: typeof local = {};
    if (!label.trim()) errors.label = "Enter a label, for example Monthly.";
    if (amountMinor === null) {
      errors.amount = currencyDigits(currency) > 0 ? "Enter an amount, for example 120 or 120.50." : "Enter a whole amount, for example 120.";
    }
    if (!/^\d{1,4}$/.test(days.trim()) || term < 1 || term > 3660) errors.days = "Enter a term from 1 to 3660 days.";
    setLocal(errors);
    if (errors.label || errors.amount || errors.days || amountMinor === null) return;

    const result = await action.run({
      slug: organization.slug,
      id: product.id,
      label: label.trim(),
      amount_minor: amountMinor,
      duration_days: term,
    });
    if (result.ok) {
      toast.show({ tone: "success", title: "Price added", body: `${label.trim()} is on sale for ${product.name}.` });
      void router.invalidate();
      onClose();
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !action.pending) onClose();
      }}
    >
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody>
            <DialogTitle>Add a price to {product.name}</DialogTitle>
            {action.error && action.error.code !== "validation_failed" ? (
              <FailureNotice error={action.error} title="The price was not added" />
            ) : null}
            <div className="form">
              <Field id="price-label" label="Label" error={labelError}>
                <Input
                  id="price-label"
                  value={label}
                  maxLength={200}
                  autoFocus
                  aria-invalid={labelError ? true : undefined}
                  aria-describedby={describedBy("price-label", undefined, labelError)}
                  onChange={(event) => setLabel(event.target.value)}
                />
              </Field>
              <div className="form-row">
                <Field id="price-amount" label={`Amount (${currency})`} error={amountError}>
                  <Input
                    id="price-amount"
                    inputMode="decimal"
                    value={amount}
                    aria-invalid={amountError ? true : undefined}
                    aria-describedby={describedBy("price-amount", undefined, amountError)}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </Field>
                <Field id="price-days" label="Term in days" error={daysError}>
                  <Input
                    id="price-days"
                    inputMode="numeric"
                    value={days}
                    aria-invalid={daysError ? true : undefined}
                    aria-describedby={describedBy("price-days", undefined, daysError)}
                    onChange={(event) => setDays(event.target.value)}
                  />
                </Field>
              </div>
              <Notice tone="info" title="Amount and term are fixed">
                <p>
                  {amountMinor !== null && term >= 1
                    ? `${formatMoney(amountMinor, currency)} for ${formatDuration(term)}. `
                    : null}
                  To change them later, add a new price and archive this one.
                </p>
              </Notice>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={action.pending}>
              Cancel
            </Button>
            <SubmitButton pending={action.pending} pendingLabel="Adding…">
              Add price
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
