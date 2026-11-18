import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { AlignLeft, Clock, EyeOff, Gift, Globe, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { FormNotice } from "../../components/FormNotice";
import { PageActions } from "../../components/PageActions";
import { useToast } from "../../components/Toast";
import { Kbd } from "../../components/ui";
import { PROGRAM_KIND_PLURAL, formatDuration, formatMoney } from "../../lib/format";
import { useAction } from "../../lib/hooks";
import { useCan, useOrganization } from "../../lib/organization";
import type { Failure, Result } from "../../lib/result";
import { useModKeyLabel, useShortcut } from "../../lib/shortcuts";
import { archivePrice, createPrice, createProduct, listProducts, updateProduct } from "../../lib/staff.functions";
import { PROGRAM_KINDS } from "../../lib/validate";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_BENEFITS,
  benefitDraft,
  checkDraft,
  draftChanged,
  hasErrors,
  mainPrice,
  priceChange,
  productFields,
  startBenefits,
  startDraft,
  type BenefitDraft,
  type DraftErrors,
  type Product,
  type ProductDraft,
  type ProductKind,
  type Scope,
} from "./facts";
import { PRODUCT_ICON, ProductTile } from "./kinds";
import { replacePrice } from "./priceChange";

const sendNew = (input: Parameters<typeof createProduct>[0]["data"]) => createProduct({ data: input });
const sendEdit = (input: Parameters<typeof updateProduct>[0]["data"]) => updateProduct({ data: input });
const sendPrice = (input: Parameters<typeof createPrice>[0]["data"]) => createPrice({ data: input });

const icon = { strokeWidth: 1.5, "aria-hidden": true, focusable: false } as const;
const FORM_ID = "product-form";

const KIND_META: Record<ProductKind, string> = { membership: "Access for a set time", pass: "A set number of uses" };

/** What went wrong after a save started. Field errors show on the fields instead. */
type Problem = { title: string; error: Failure; after?: string } | null;

/** A call that throws, such as a dropped connection, becomes a failure, so each step reports itself. */
async function settle<T>(call: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await call();
  } catch {
    return { ok: false, error: { status: 0, code: "api_unreachable", message: "Check the connection, then try again." } };
  }
}

function focusField(id: string) {
  const field = document.getElementById(id);
  field?.scrollIntoView({ block: "center" });
  field?.focus();
}

/** Rails field names to this form's fields. */
function serverErrors(details: Record<string, string[]> | undefined): DraftErrors {
  if (!details) return {};
  const join = (messages?: string[]) => (messages?.length ? `${messages.join(", ")}.`.replace(/^./, (c) => c.toUpperCase()) : undefined);
  const errors: DraftErrors = {
    name: join(details.name),
    amount: join(details.amount_minor),
    days: join(details.duration_days),
    benefits: join([...(details.benefits ?? []), ...Object.entries(details).filter(([key]) => key.startsWith("benefits.")).flatMap(([, list]) => list)]),
  };
  return Object.fromEntries(Object.entries(errors).filter(([, value]) => value)) as DraftErrors;
}

/**
 * Paper "New product" and "Edit product": a page, not a dialog. Name, price,
 * and type; the length; then what the product gives. The gym site and the
 * note sit on the right. ⌘↵ saves. Leaving with changes asks first.
 *
 * Staff see one price. A new amount or length adds a new price and archives
 * the old one, because Rails never changes a price a sale may use.
 */
export function ProductForm({ product, programs }: { product?: Product; programs: Schemas["ProgramListItem"][] }) {
  const can = useCan();
  // A new product needs a price, and adding a price needs products:update.
  const allowed = product ? can("products:update") : can("products:create") && can("products:update");
  if (!allowed) {
    return (
      <div className="page program-form product-form">
        <FormHead title={product ? `Edit ${product.name}` : "New product"} />
        <div className="list-state" role="status">
          <p className="list-state__title">Your role cannot change products.</p>
          <p className="list-state__text">A manager adds and edits products.</p>
        </div>
      </div>
    );
  }
  return <Form product={product} programs={programs} />;
}

function FormHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="program-form__head">
      <ProductTile kind="new" size={40} />
      <h1>{title}</h1>
      {children ? <PageActions>{children}</PageActions> : null}
    </header>
  );
}

function Form({ product, programs }: { product?: Product; programs: Schemas["ProgramListItem"][] }) {
  const organization = useOrganization();
  const currency = organization.currency;
  const navigate = useNavigate();
  const toast = useToast();
  const modKey = useModKeyLabel();
  const creating = useAction(sendNew);
  const editing = useAction(sendEdit);
  const addingPrice = useAction(sendPrice);
  const [changingPrice, setChangingPrice] = useState(false);
  const pending = creating.pending || editing.pending || addingPrice.pending || changingPrice;
  const form = useRef<HTMLFormElement>(null);
  const saved = useRef(false);
  // The prices staff saw when the form opened. A price change keeps them apart from the one it adds.
  const known = useRef(new Set(product?.prices.map((price) => price.id) ?? []));
  // A product this page created already. A retry adds only its price.
  const created = useRef<Product | null>(null);

  const current = product ? mainPrice(product) : null;
  const [start] = useState<ProductDraft>(() => startDraft(product, currency));
  const [draft, setDraft] = useState<ProductDraft>(start);
  const [noteOpen, setNoteOpen] = useState(start.description !== "");
  const [local, setLocal] = useState<DraftErrors>({});
  const [server, setServer] = useState<DraftErrors>({});
  const [problem, setProblem] = useState<Problem>(null);

  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setBenefit = (key: number, change: Partial<BenefitDraft>) =>
    setDraft((value) => ({ ...value, benefits: value.benefits.map((item) => (item.key === key ? { ...item, ...change } : item)) }));

  const dirty = draftChanged(draft, start);
  const blocker = useBlocker({
    shouldBlockFn: () => dirty && !saved.current,
    enableBeforeUnload: () => dirty && !saved.current,
    withResolver: true,
  });
  useShortcut("Enter", () => form.current?.requestSubmit(), { mod: true, enabled: !pending && blocker.status !== "blocked" });

  const errors: DraftErrors = { ...server, ...local, benefit: local.benefit };
  const change = product ? priceChange(draft, current, currency) : null;

  function chooseKind(kind: ProductKind) {
    // The benefits follow the type until staff change them.
    const plain = (list: BenefitDraft[]) => JSON.stringify(list.map(({ key: _key, ...rest }) => rest));
    setDraft((value) => ({
      ...value,
      kind,
      benefits: plain(value.benefits) === plain(startBenefits(value.kind)) ? startBenefits(kind) : value.benefits,
    }));
  }

  function finish(target: Product, toastInput: Parameters<typeof toast.show>[0]) {
    saved.current = true;
    toast.show(toastInput);
    // Replace this form in history, so Back returns to the list or the product.
    void navigate({ to: "/$org/products/$productId", params: { org: organization.slug, productId: target.id }, replace: true });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const found = checkDraft(draft, currency);
    setLocal(found);
    setServer({});
    setProblem(null);
    if (hasErrors(found)) {
      const firstBenefit = found.benefit ? Object.keys(found.benefit)[0] : undefined;
      const id = found.name
        ? "product-name"
        : found.amount
          ? "product-amount"
          : found.days
            ? "product-days"
            : firstBenefit
              ? `benefit-name-${firstBenefit}`
              : "product-add-benefit";
      focusField(id);
      return;
    }
    if (product) await save(product);
    else await create();
  }

  async function create() {
    let item = created.current;
    if (!item) {
      const result = await creating.run({ slug: organization.slug, kind: draft.kind, ...productFields(draft) });
      if (!result.ok) {
        if (result.error.code === "validation_failed") setServer(serverErrors(result.error.details));
        else setProblem({ title: "The product was not created", error: result.error, after: "Your details are kept." });
        return;
      }
      item = result.data;
      created.current = item;
    }
    const spec = priceChange(draft, null, currency)!;
    const priced = await addingPrice.run({ slug: organization.slug, id: item.id, ...spec });
    if (!priced.ok) {
      // The product exists now. Open it, so staff never create it twice; Edit sets the price.
      finish(item, {
        tone: "error",
        title: `${item.name} created. No price was added`,
        body: `${priced.error.code === "validation_failed" ? "The price was not accepted." : ""} Edit the product to set its price.`.trim(),
      });
      return;
    }
    const money = formatMoney(spec.amount_minor, currency);
    finish(item, {
      tone: "success",
      title: `${item.name} created`,
      body: item.published ? `On sale at ${money}` : `On sale at the desk at ${money}`,
    });
  }

  async function save(item: Product) {
    const fields = productFields(draft);
    const startFields = productFields(start);
    const fieldsChanged = JSON.stringify(fields) !== JSON.stringify(startFields);
    if (fieldsChanged) {
      const sameBenefits = JSON.stringify(fields.benefits) === JSON.stringify(startFields.benefits);
      const result = await editing.run({
        slug: organization.slug,
        id: item.id,
        name: fields.name,
        description: fields.description,
        published: fields.published,
        ...(sameBenefits ? {} : { benefits: fields.benefits }),
      });
      if (!result.ok) {
        if (result.error.code === "validation_failed") setServer(serverErrors(result.error.details));
        else setProblem({ title: "The changes were not saved", error: result.error, after: "Your details are kept." });
        return;
      }
    }

    const spec = priceChange(draft, current, currency);
    if (spec) {
      setChangingPrice(true);
      const result = await replacePrice(
        {
          load: () =>
            settle(async () => {
              const list = await listProducts({ data: { slug: organization.slug } });
              if (!list.ok) return list;
              const found = list.data.find((candidate) => candidate.id === item.id);
              return found ? { ok: true, data: found } : { ok: false, error: { status: 404, code: "not_found", message: "Product not found" } };
            }),
          create: (priceSpec) => settle(() => createPrice({ data: { slug: organization.slug, id: item.id, ...priceSpec } })),
          archive: (priceId) => settle(() => archivePrice({ data: { slug: organization.slug, id: priceId } })),
        },
        { known: known.current, oldPriceId: current && !current.archived_at ? current.id : null, spec },
      );
      setChangingPrice(false);
      const next = formatMoney(spec.amount_minor, currency);
      const old = current ? formatMoney(current.amount_minor, current.currency) : "";
      if (!result.ok && result.stage === "create") {
        if (result.error.code === "validation_failed") setServer(serverErrors(result.error.details));
        else
          setProblem({
            title: "The new price was not saved",
            error: result.error,
            after: fieldsChanged ? "Your other changes were saved. Save again to set the price." : "Save again to set the price.",
          });
        return;
      }
      if (!result.ok) {
        // The new price is on sale; the old one is too. Saving again only archives it.
        setProblem({
          title: `${old} is still on sale`,
          error: result.error,
          after: `${next} is on sale now too. Save again to archive ${old}, or archive it on the product page.`,
        });
        return;
      }
      finish(item, {
        tone: "success",
        title: "Product saved",
        body: `New sales use ${next} for ${formatDuration(spec.duration_days)}. Members who bought keep their price.`,
      });
      return;
    }
    finish(item, { tone: "success", title: "Product saved", body: "New sales use these terms." });
  }

  const submitLabel = product ? "Save changes" : "Create product";
  const anyFieldError = hasErrors(errors);

  return (
    <div className="page program-form product-form">
      <FormHead title={product ? `Edit ${product.name}` : "New product"}>
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
              {product ? "Saving…" : "Creating…"}
            </>
          ) : (
            <>
              {submitLabel}
              <Kbd>{modKey}↵</Kbd>
            </>
          )}
        </Button>
      </FormHead>

      <form id={FORM_ID} ref={form} className="program-form__layout" onSubmit={onSubmit} noValidate>
        <div className="program-form__main">
          {problem ? (
            <FormNotice title={problem.title} error={problem.error} after={problem.after} />
          ) : anyFieldError ? (
            <p className="visually-hidden" role="alert">
              {product ? "The changes were not saved." : "The product was not created."} Fix the marked fields.
            </p>
          ) : null}

          <section className="program-form__section" aria-labelledby="product-details-title">
            <div className="mx-section__head">
              <AlignLeft {...icon} />
              <h2 id="product-details-title">Details</h2>
            </div>
            <div className="program-form__fields">
              <div className="product-form__row">
                <FieldBox id="product-name" label="Name" error={errors.name}>
                  <Input
                    id="product-name"
                    className="program-input"
                    autoFocus={!product}
                    autoComplete="off"
                    maxLength={200}
                    value={draft.name}
                    onChange={(event) => set("name", event.target.value)}
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={errors.name ? "product-name-error" : undefined}
                  />
                </FieldBox>
                <FieldBox
                  id="product-amount"
                  label="Price"
                  error={errors.amount}
                  hint={
                    change && current
                      ? `New sales only. Saving adds ${formatMoney(change.amount_minor, currency)} for ${formatDuration(change.duration_days)} and archives ${formatMoney(current.amount_minor, current.currency)}. Members who bought keep their price.`
                      : undefined
                  }
                >
                  <span className="program-input program-input--suffix" data-invalid={errors.amount ? true : undefined}>
                    <span className="program-input__unit" aria-hidden="true">
                      {currency === "MYR" ? "RM" : currency}
                    </span>
                    <input
                      id="product-amount"
                      className="program-input__bare"
                      inputMode="decimal"
                      autoComplete="off"
                      value={draft.amount}
                      onChange={(event) => set("amount", event.target.value)}
                      aria-invalid={errors.amount ? true : undefined}
                      aria-describedby={[errors.amount ? "product-amount-error" : "", change ? "product-amount-hint" : ""].filter(Boolean).join(" ") || undefined}
                    />
                  </span>
                </FieldBox>
              </div>

              {product ? null : (
                <fieldset className="program-kinds">
                  <legend className="program-field__label">Type</legend>
                  <div className="program-kinds__cards product-kinds">
                    {(["membership", "pass"] as const).map((kind) => {
                      const Icon = PRODUCT_ICON[kind];
                      return (
                        <label key={kind} className="program-kind">
                          <input
                            type="radio"
                            name="product-kind"
                            className="program-kind__input"
                            value={kind}
                            checked={draft.kind === kind}
                            onChange={() => chooseKind(kind)}
                          />
                          <Icon className="program-kind__icon" {...icon} />
                          <span className="program-kind__title">{kind === "membership" ? "Membership" : "Pass"}</span>
                          <span className="program-kind__meta">{KIND_META[kind]}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
            </div>
          </section>

          <section className="program-form__section" aria-labelledby="product-terms-title">
            <div className="mx-section__head">
              <Clock {...icon} />
              <h2 id="product-terms-title">Terms</h2>
            </div>
            <div className="program-form__fields">
              <div className="product-form__terms">
                <FieldBox id="product-days" label={draft.kind === "pass" ? "Valid for" : "Length"} error={errors.days}>
                  <span className="program-input program-input--suffix" data-invalid={errors.days ? true : undefined}>
                    <input
                      id="product-days"
                      className="program-input__bare"
                      inputMode="numeric"
                      autoComplete="off"
                      value={draft.days}
                      onChange={(event) => set("days", event.target.value)}
                      aria-invalid={errors.days ? true : undefined}
                      aria-describedby={errors.days ? "product-days-error product-days-unit" : "product-days-unit"}
                    />
                    <span id="product-days-unit" className="program-input__unit">
                      days from fulfillment
                    </span>
                  </span>
                </FieldBox>
              </div>
            </div>
          </section>

          <BenefitsFields draft={draft} programs={programs} errors={errors} onChange={setBenefit} onSet={(benefits) => set("benefits", benefits)} />
        </div>

        <aside className="program-form__side" aria-label="Gym site and note">
          <div className="program-form__side-group">
            <FieldBox id="product-visibility" label="Gym site">
              <span className="program-select">
                {draft.published ? <Globe className="program-select__icon" {...icon} /> : <EyeOff className="program-select__icon" {...icon} />}
                <NativeSelect
                  id="product-visibility"
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
          <div className="program-form__side-group">
            {noteOpen ? (
              <FieldBox id="product-note" label="Note">
                <Textarea
                  id="product-note"
                  className="program-input program-input--note"
                  rows={3}
                  maxLength={2000}
                  value={draft.description}
                  onChange={(event) => set("description", event.target.value)}
                />
              </FieldBox>
            ) : (
              <div className="program-form__note">
                <span className="program-field__label">Note</span>
                <button
                  type="button"
                  className="program-form__add"
                  aria-label="Add a note"
                  onClick={() => {
                    setNoteOpen(true);
                    requestAnimationFrame(() => document.getElementById("product-note")?.focus());
                  }}
                >
                  <Plus {...icon} />
                </button>
                <span className="program-form__no-note">No note</span>
              </div>
            )}
          </div>
        </aside>
      </form>

      <ConfirmDialog
        open={blocker.status === "blocked"}
        tone="critical"
        title={product ? "Discard these changes?" : "Discard this product?"}
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      >
        <p>{product ? `Your changes to ${product.name} will be lost.` : `The details you entered${draft.name.trim() ? ` for ${draft.name.trim()}` : ""} will be lost.`}</p>
      </ConfirmDialog>
    </div>
  );
}

/* ---------- Benefits ---------- */

/** What the product gives. Each sale copies these, so a change applies to new sales only. */
function BenefitsFields({
  draft,
  programs,
  errors,
  onChange,
  onSet,
}: {
  draft: ProductDraft;
  programs: Schemas["ProgramListItem"][];
  errors: DraftErrors;
  onChange: (key: number, change: Partial<BenefitDraft>) => void;
  onSet: (benefits: BenefitDraft[]) => void;
}) {
  const organization = useOrganization();
  return (
    <section className="program-form__section" aria-labelledby="product-benefits-title">
      <div className="mx-section__head">
        <Gift {...icon} />
        <h2 id="product-benefits-title">Benefits</h2>
        {draft.benefits.length < MAX_BENEFITS ? (
          <Button
            id="product-add-benefit"
            type="button"
            variant="secondary"
            size="compact"
            onClick={() => onSet([...draft.benefits, benefitDraft()])}
          >
            <Plus {...icon} />
            Add benefit
          </Button>
        ) : null}
      </div>
      {errors.benefits ? (
        <p className="program-field__error" role="alert">
          {errors.benefits}
        </p>
      ) : null}
      <div className="product-form__benefits">
        {draft.benefits.map((benefit, index) => {
          const found = errors.benefit?.[benefit.key] ?? {};
          const id = (field: string) => `benefit-${field}-${benefit.key}`;
          return (
            <fieldset key={benefit.key} className="product-benefit-fields">
              <legend className="product-benefit-fields__legend">
                Benefit {index + 1}
                <button
                  type="button"
                  className="program-form__add"
                  aria-label={`Remove benefit ${index + 1}`}
                  disabled={draft.benefits.length === 1}
                  onClick={() => onSet(draft.benefits.filter((item) => item.key !== benefit.key))}
                >
                  <Trash2 {...icon} />
                </button>
              </legend>
              <div className="product-benefit-fields__row">
                <FieldBox id={id("name")} label="Name" error={found.name}>
                  <Input
                    id={id("name")}
                    className="program-input"
                    maxLength={200}
                    value={benefit.name}
                    onChange={(event) => onChange(benefit.key, { name: event.target.value })}
                    aria-invalid={found.name ? true : undefined}
                    aria-describedby={found.name ? `${id("name")}-error` : undefined}
                  />
                </FieldBox>
                <FieldBox id={id("kind")} label="Gives">
                  <NativeSelect
                    id={id("kind")}
                    className="program-input"
                    value={benefit.kind}
                    onChange={(event) => onChange(benefit.key, { kind: event.target.value as Schemas["BenefitKind"] })}
                  >
                    <NativeSelectOption value="gym_access">Gym access</NativeSelectOption>
                    <NativeSelectOption value="program_access">Program bookings</NativeSelectOption>
                  </NativeSelect>
                </FieldBox>
              </div>
              <div className="product-benefit-fields__row product-benefit-fields__row--three">
                <FieldBox id={id("usage")} label={benefit.kind === "gym_access" ? "Visits per period" : "Bookings"} error={found.usage}>
                  <Input
                    id={id("usage")}
                    className="program-input"
                    inputMode="numeric"
                    placeholder="Unlimited"
                    value={benefit.usage}
                    onChange={(event) => onChange(benefit.key, { usage: event.target.value })}
                    aria-invalid={found.usage ? true : undefined}
                    aria-describedby={found.usage ? `${id("usage")}-error` : undefined}
                  />
                </FieldBox>
                <FieldBox id={id("location")} label="Location">
                  <NativeSelect
                    id={id("location")}
                    className="program-input"
                    value={benefit.locationId}
                    onChange={(event) => onChange(benefit.key, { locationId: event.target.value })}
                  >
                    <NativeSelectOption value="">All locations</NativeSelectOption>
                    {organization.locations.map((location) => (
                      <NativeSelectOption key={location.id} value={location.id}>
                        {location.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </FieldBox>
                {benefit.kind === "program_access" ? (
                  <FieldBox id={id("scope")} label="Programs" error={found.programs}>
                    <NativeSelect
                      id={id("scope")}
                      className="program-input"
                      value={benefit.scope}
                      onChange={(event) => onChange(benefit.key, { scope: event.target.value as Scope })}
                      aria-invalid={found.programs ? true : undefined}
                      aria-describedby={found.programs ? `${id("scope")}-error` : undefined}
                    >
                      <NativeSelectOption value="all">Every program</NativeSelectOption>
                      {PROGRAM_KINDS.map((value) => (
                        <NativeSelectOption key={value} value={value}>
                          All {PROGRAM_KIND_PLURAL[value]}
                        </NativeSelectOption>
                      ))}
                      <NativeSelectOption value="selected" disabled={!programs.length && benefit.scope !== "selected"}>
                        Selected programs
                      </NativeSelectOption>
                    </NativeSelect>
                  </FieldBox>
                ) : null}
              </div>
              {benefit.kind === "program_access" && benefit.scope === "selected" ? (
                programs.length ? (
                  <fieldset className="product-benefit-fields__programs">
                    <legend className="visually-hidden">Programs benefit {index + 1} books</legend>
                    {programs.map((program) => {
                      const checked = benefit.programIds.includes(program.id);
                      return (
                        <label key={program.id} className="product-benefit-fields__program">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) =>
                              onChange(benefit.key, {
                                programIds: value === true ? [...benefit.programIds, program.id] : benefit.programIds.filter((item) => item !== program.id),
                              })
                            }
                          />
                          {program.name}
                        </label>
                      );
                    })}
                  </fieldset>
                ) : (
                  <p className="product-form__muted">
                    {benefit.programIds.length} {benefit.programIds.length === 1 ? "program" : "programs"} chosen. Your role cannot see programs, so they stay as they are.
                  </p>
                )
              ) : null}
            </fieldset>
          );
        })}
      </div>
    </section>
  );
}

/** A label above the control, an optional hint, and a one-line error under it. */
function FieldBox({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="program-field">
      <label className="program-field__label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="program-field__error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="product-form__hint" aria-live="polite">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
