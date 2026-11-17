import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Banknote, MapPin, Plus, Receipt, Search, Tag, X } from "lucide-react";
import { Combobox } from "../../components/Combobox";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import { FailureNotice, Kbd, Notice, SubmitButton, describedBy, initials } from "../../components/ui";
import { PAYMENT_METHOD_LABEL, PRODUCT_KIND_LABEL, formatMoney, minorToInput } from "../../lib/format";
import { useAction, useIdempotencyKey } from "../../lib/hooks";
import { useCan, useDeskLocation, useOrganization } from "../../lib/organization";
import type { Result } from "../../lib/result";
import { useModKeyLabel, useShortcut } from "../../lib/shortcuts";
import { createSale, recordPayment } from "../../lib/staff.functions";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  checkNewSale,
  createdText,
  discardText,
  draftBalance,
  filterOptions,
  optionFacts,
  optionTitle,
  saleOptions,
  type DraftPayment,
  type NewSaleErrors,
  type SaleKind,
  type SaleOption,
} from "./saleDraft";
import { KIND_ICON, PaymentFields, SaleDialog, checkPaymentAmount } from "./SaleDialogs";
import { METHOD_ICON } from "./SaleFacts";

const sendSale = (input: Parameters<typeof createSale>[0]["data"]) => createSale({ data: input });
const sendPayment = (input: Parameters<typeof recordPayment>[0]["data"]) => recordPayment({ data: input });

const icon = { strokeWidth: 1.5, "aria-hidden": true, focusable: false } as const;
const markIcon = { strokeWidth: 1.75, "aria-hidden": true, focusable: false } as const;
const FORM_ID = "new-sale";

function focusField(id: string) {
  const field = document.getElementById(id);
  field?.scrollIntoView({ block: "center" });
  field?.focus();
}

export interface NewSaleData {
  members: Result<Schemas["Member"][]>;
  products: Result<Schemas["StaffProduct"][]>;
}

/**
 * The New sale page. Staff choose the member, one product at its current
 * price, and the location, and can add the payment the desk received. Create
 * sale (⌘↵) records the sale in Rails, then the payment, and opens the sale.
 */
export function NewSale({ data, memberId }: { data: NewSaleData; memberId?: string }) {
  const can = useCan();
  if (!can("purchases:create")) {
    return (
      <div className="page new-sale">
        <NewSaleHead />
        <Notice tone="warning" title="You cannot sell">
          <p>Selling needs the purchases:create permission. Ask an owner to change your role.</p>
        </Notice>
      </div>
    );
  }
  if (!data.members.ok || !data.products.ok) {
    return (
      <div className="page new-sale">
        <NewSaleHead />
        {!data.members.ok ? <FailureNotice error={data.members.error} title="Members did not load" /> : null}
        {!data.products.ok ? <FailureNotice error={data.products.error} title="Products did not load" /> : null}
      </div>
    );
  }
  return <NewSaleForm members={data.members.data} options={saleOptions(data.products.data)} initialMemberId={memberId} />;
}

function NewSaleHead({ children }: { children?: ReactNode }) {
  return (
    <header className="new-sale__head">
      <span className="new-sale__icon" aria-hidden="true">
        <Receipt {...icon} />
      </span>
      <h1>New sale</h1>
      {children ? <div className="new-sale__actions">{children}</div> : null}
    </header>
  );
}

function Band({ id, title, icon: Icon, action }: { id: string; title: string; icon: typeof Tag; action?: ReactNode }) {
  return (
    <div className="mx-section__head sale-band">
      <Icon {...icon} />
      <h2 id={`${id}-title`}>{title}</h2>
      {action}
    </div>
  );
}

function NewSaleForm({
  members,
  options,
  initialMemberId,
}: {
  members: Schemas["Member"][];
  options: SaleOption[];
  initialMemberId?: string;
}) {
  const organization = useOrganization();
  const can = useCan();
  const navigate = useNavigate();
  const toast = useToast();
  const modKey = useModKeyLabel();
  const form = useRef<HTMLFormElement>(null);
  const saved = useRef(false);
  const [saleKey, renewSaleKey] = useIdempotencyKey();
  const [paymentKey] = useIdempotencyKey();
  const creating = useAction(sendSale);
  const paying = useAction(sendPayment);
  const pending = creating.pending || paying.pending;

  const preselected = members.some((member) => member.id === initialMemberId) ? initialMemberId! : "";
  const [memberId, setMemberId] = useState(preselected);
  const [priceId, setPriceId] = useState("");
  const [payment, setPayment] = useState<DraftPayment | null>(null);
  // Start at the desk location, and follow it when the top bar changes it.
  const deskLocationId = useDeskLocation()?.id ?? "";
  const [locationId, setLocationId] = useState(deskLocationId);
  useEffect(() => setLocationId(deskLocationId), [deskLocationId]);
  const [local, setLocal] = useState<NewSaleErrors>({});
  const [dialog, setDialog] = useState<"product" | "payment" | null>(null);
  // Choosing or clearing the member swaps the search for the member, or back.
  // Focus follows to the control that replaced the one staff used.
  const moveFocus = useRef(false);
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    document.getElementById("sale-member")?.focus();
  }, [memberId]);

  const member = members.find((item) => item.id === memberId);
  const option = options.find((item) => item.price.id === priceId);
  const canPay = can("payments:create");

  const dirty = Boolean(priceId || payment || memberId !== preselected);
  const blocker = useBlocker({
    shouldBlockFn: () => dirty && !saved.current,
    enableBeforeUnload: () => dirty && !saved.current,
    withResolver: true,
  });

  useShortcut("Enter", () => form.current?.requestSubmit(), {
    mod: true,
    enabled: !pending && dialog === null && blocker.status !== "blocked",
  });

  const error = creating.error;
  const server = error?.code === "validation_failed" ? error.details : undefined;
  const memberError = local.member ?? server?.member_id?.join(" ");
  const productError =
    local.product ?? server?.price_id?.join(" ") ?? (error?.code === "price_unavailable" ? error.message : undefined);
  const locationError = local.location ?? server?.location_id?.join(" ");
  const fieldError = Boolean(memberError || productError || locationError);

  /** A changed sale is a new request, so it needs a new key. */
  function edited() {
    if (creating.error) {
      renewSaleKey();
      creating.reset();
    }
  }

  function choosePrice(next: string) {
    setPriceId(next);
    // The payment was checked against the old total.
    const total = options.find((item) => item.price.id === next)?.price.amount_minor ?? 0;
    if (payment && payment.amount_minor > total) setPayment(null);
    setLocal((current) => ({ ...current, product: undefined }));
    edited();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const errors = checkNewSale({ memberId, priceId, locationId });
    setLocal(errors);
    if (errors.member || errors.product || errors.location) {
      focusField(errors.member ? "sale-member" : errors.product ? "sale-add-product" : "sale-location");
      return;
    }

    const created = await creating.run({
      slug: organization.slug,
      idempotencyKey: saleKey,
      member_id: memberId,
      price_id: priceId,
      location_id: locationId,
    });
    if (!created.ok) {
      if (created.error.code === "validation_failed" || created.error.code === "price_unavailable") {
        focusField(created.error.details?.member_id ? "sale-member" : "sale-add-product");
      }
      return;
    }

    // The sale exists now. Leaving the form never asks to discard it.
    saved.current = true;
    let sale = created.data;
    if (payment) {
      const paid = await paying.run({
        slug: organization.slug,
        idempotencyKey: paymentKey,
        saleId: sale.id,
        amount_minor: payment.amount_minor,
        method: payment.method,
        reference: payment.reference.trim() || null,
      });
      if (paid.ok) {
        sale = paid.data;
      } else {
        toast.show({
          tone: "error",
          title: "Sale created, payment not recorded",
          body: `${paid.error.message} Record the payment on the sale.`,
        });
      }
    }
    toast.show({
      tone: "success",
      title: "Sale created",
      body: createdText({
        productName: sale.line_item.product_name,
        memberName: sale.member.name,
        balance_minor: sale.balance_minor,
        currency: sale.currency,
      }),
    });
    // Replace this form in history, so Back returns to where the sale started.
    void navigate({ to: "/$org/sales/$saleId", params: { org: organization.slug, saleId: sale.id }, replace: true });
  }

  const total = option?.price.amount_minor ?? 0;
  const currency = option?.price.currency ?? "";
  const balance = draftBalance(total, payment);

  return (
    <div className="page new-sale">
      <NewSaleHead>
        <Button
          type="submit"
          form={FORM_ID}
          size="compact"
          disabled={pending}
          aria-busy={pending || undefined}
          aria-keyshortcuts="Meta+Enter Control+Enter"
        >
          {pending ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Creating…
            </>
          ) : (
            <>
              Create sale
              <Kbd>{modKey}↵</Kbd>
            </>
          )}
        </Button>
      </NewSaleHead>

      <form id={FORM_ID} ref={form} className="new-sale__main" onSubmit={onSubmit} noValidate>
        {error && !fieldError ? <FailureNotice error={error} title="The sale was not created" /> : null}

        <section className="mx-section" aria-labelledby="products-title">
          <Band
            id="products"
            title="Products"
            icon={Tag}
            action={
              option ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="compact"
                  className="sale-band__button"
                  onClick={() => setDialog("product")}
                >
                  Change
                </Button>
              ) : null
            }
          />
          {option ? (
            <ul className="sale-money-rows">
              <li className="sale-line">
                <span className="sale-tile" aria-hidden="true">
                  <ProductIcon kind={option.kind} />
                </span>
                <div className="sale-line__main">
                  <span className="sale-line__name">{optionTitle(option, options)}</span>
                  <span className="sale-line__sub">
                    {PRODUCT_KIND_LABEL[option.kind]} · {optionFacts(option)}
                  </span>
                </div>
                <span className="sale-line__total">{formatMoney(option.price.amount_minor, option.price.currency)}</span>
                <RemoveButton label={`Remove ${option.product.name}`} disabled={pending} onClick={() => choosePrice("")} />
              </li>
            </ul>
          ) : options.length === 0 ? (
            <div className="new-sale__empty">
              <p>No membership or pass has a price to sell.</p>
              {can("products:update") ? (
                <Link to="/$org/products" params={{ org: organization.slug }} className="new-sale__link">
                  Open Products
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="new-sale__empty" data-invalid={productError ? true : undefined}>
              <Button
                id="sale-add-product"
                type="button"
                variant="ghost"
                size="compact"
                className="new-sale__add"
                aria-describedby={productError ? "sale-add-product-error" : undefined}
                onClick={() => setDialog("product")}
              >
                <Plus {...markIcon} />
                Product
              </Button>
            </div>
          )}
          <FieldError id="sale-add-product-error" className="new-sale__error">
            {productError}
          </FieldError>
          {option ? (
            <div className="sale-total">
              <span>Total</span>
              <span className="sale-total__amount">{formatMoney(total, currency)}</span>
            </div>
          ) : null}
        </section>

        <section className="mx-section" aria-labelledby="payment-title">
          <Band
            id="payment"
            title="Payment"
            icon={Banknote}
            action={
              canPay && !payment ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="compact"
                  className="sale-band__button"
                  disabled={!option || pending}
                  onClick={() => setDialog("payment")}
                >
                  <Plus {...markIcon} />
                  Record payment
                </Button>
              ) : null
            }
          />
          {!option ? (
            <p className="new-sale__hint">Add a product to record a payment.</p>
          ) : payment ? (
            <ul className="sale-money-rows">
              <PaymentRow payment={payment} currency={currency} disabled={pending} onRemove={() => setPayment(null)} />
            </ul>
          ) : (
            <p className="sale-empty">No payment yet</p>
          )}
          {option ? (
            <div className="sale-total" data-state={balance > 0 ? "due" : undefined}>
              <span>Balance due</span>
              <span className="sale-total__amount">{formatMoney(balance, currency)}</span>
            </div>
          ) : null}
        </section>
      </form>

      <aside className="new-sale__side" aria-label="Sale details">
        <div className="new-sale__group">
          {member ? (
            <>
              <div className="new-sale__group-head">
                <h2 id="sale-member-label">Member</h2>
                <button
                  type="button"
                  id="sale-member"
                  className="new-sale__icon-button"
                  disabled={pending}
                  onClick={() => {
                    moveFocus.current = true;
                    setMemberId("");
                    edited();
                  }}
                >
                  <X {...markIcon} />
                  <span className="visually-hidden">Change member: {member.name}</span>
                </button>
              </div>
              <div className="new-sale__member">
                <span className="new-sale__avatar" aria-hidden="true">
                  {initials(member.name)}
                </span>
                <div className="new-sale__member-text">
                  <span className="new-sale__member-name">{member.name}</span>
                  <span className="new-sale__member-sub">{member.email}</span>
                </div>
              </div>
            </>
          ) : members.length === 0 ? (
            <>
              <div className="new-sale__group-head">
                <h2>Member</h2>
              </div>
              <p className="new-sale__hint new-sale__hint--plain">No members yet.</p>
              <Link to="/$org/members/new" params={{ org: organization.slug }} className="new-sale__link">
                New member
              </Link>
            </>
          ) : (
            <Combobox
              id="sale-member"
              label="Member"
              placeholder="Search name or email"
              emptyText="No member matches. Check the spelling."
              options={members.map((item) => ({ value: item.id, label: item.name, detail: item.email }))}
              value={null}
              onChange={(value) => {
                if (!value) return;
                moveFocus.current = true;
                setMemberId(value);
                setLocal((current) => ({ ...current, member: undefined }));
                edited();
              }}
              error={memberError}
              invalid={Boolean(memberError)}
              required
            />
          )}
        </div>

        <div className="new-sale__group">
          <div className="new-sale__group-head">
            <label htmlFor="sale-location">Location</label>
          </div>
          <div className="new-sale__select">
            <MapPin {...markIcon} />
            <NativeSelect
              id="sale-location"
              className="new-sale__native"
              value={locationId}
              disabled={pending}
              onChange={(event) => {
                setLocationId(event.target.value);
                setLocal((current) => ({ ...current, location: undefined }));
                edited();
              }}
              aria-invalid={locationError ? true : undefined}
              aria-describedby={describedBy("sale-location", undefined, locationError)}
            >
              {organization.locations.map((location) => (
                <NativeSelectOption key={location.id} value={location.id}>
                  {location.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <FieldError id="sale-location-error">{locationError}</FieldError>
        </div>
      </aside>

      {dialog === "product" ? (
        <AddProductDialog
          options={options}
          initial={priceId}
          onClose={() => setDialog(null)}
          onAdd={(next) => {
            choosePrice(next);
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === "payment" && option ? (
        <DraftPaymentDialog
          total={total}
          currency={currency}
          onClose={() => setDialog(null)}
          onAdd={(next) => {
            setPayment(next);
            setDialog(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={blocker.status === "blocked"}
        tone="critical"
        title="Discard this sale?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      >
        <p>{discardText(option, payment, currency)}</p>
      </ConfirmDialog>
    </div>
  );
}

function ProductIcon({ kind }: { kind: SaleKind }) {
  const Icon = KIND_ICON[kind];
  return <Icon {...markIcon} />;
}

function RemoveButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" className="new-sale__icon-button" disabled={disabled} onClick={onClick}>
      <X {...markIcon} />
      <span className="visually-hidden">{label}</span>
    </button>
  );
}

function PaymentRow({
  payment,
  currency,
  disabled,
  onRemove,
}: {
  payment: DraftPayment;
  currency: string;
  disabled: boolean;
  onRemove: () => void;
}) {
  const MethodIcon = METHOD_ICON[payment.method];
  const label = PAYMENT_METHOD_LABEL[payment.method];
  return (
    <li className="sale-line">
      <span className="sale-tile" aria-hidden="true">
        <MethodIcon {...markIcon} />
      </span>
      <div className="sale-line__main">
        <span className="sale-line__name">{label}</span>
        {payment.reference.trim() ? <span className="sale-line__sub">Ref. {payment.reference.trim()}</span> : null}
      </div>
      <span className="sale-line__total">{formatMoney(payment.amount_minor, currency)}</span>
      <RemoveButton label={`Remove the ${label.toLowerCase()} payment`} disabled={disabled} onClick={onRemove} />
    </li>
  );
}

/* ---------- Add product ---------- */

const KIND_TABS: { value: SaleKind | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "membership", label: "Memberships" },
  { value: "pass", label: "Passes" },
];

/**
 * Chooses the one product and price for the sale. Search narrows the list;
 * the tabs show only when both memberships and passes are on sale.
 */
function AddProductDialog({
  options,
  initial,
  onClose,
  onAdd,
}: {
  options: SaleOption[];
  initial: string;
  onClose: () => void;
  onAdd: (priceId: string) => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<SaleKind | "all">("all");
  const [chosen, setChosen] = useState(initial);
  const [error, setError] = useState<string | undefined>();
  const shown = useMemo(() => filterOptions(options, query, kind), [options, query, kind]);
  const kinds = new Set(options.map((option) => option.kind));
  const groups = (["membership", "pass"] as const)
    .map((value) => ({ kind: value, items: shown.filter((option) => option.kind === value) }))
    .filter((group) => group.items.length > 0);

  return (
    <SaleDialog
      title="Add product"
      wide
      pending={false}
      onClose={onClose}
      initialFocus={searchRef}
      onSubmit={() => {
        if (!options.some((option) => option.price.id === chosen)) {
          setError("Choose a product.");
          return;
        }
        onAdd(chosen);
      }}
      submit={(kbd) => (
        <Button type="submit" size="compact" aria-keyshortcuts="Meta+Enter Control+Enter">
          Add product
          {kbd}
        </Button>
      )}
    >
      <div className="list-search new-sale__search">
        <Search className="list-search__icon" strokeWidth={1.75} aria-hidden="true" focusable="false" />
        <input
          ref={searchRef}
          className="list-search__input"
          type="search"
          placeholder="Search products"
          aria-label="Search products"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {kinds.size > 1 ? (
        <div className="new-sale__tabs" role="group" aria-label="Product type">
          {KIND_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className="new-sale__tab"
              aria-pressed={kind === tab.value}
              onClick={() => setKind(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}
      <fieldset className="new-sale__options" aria-describedby={error ? "sale-product-error" : undefined}>
        <legend className="visually-hidden">Product</legend>
        {groups.length === 0 ? <p className="sale-empty">No product matches. Clear the search.</p> : null}
        {groups.map((group) => (
          <div key={group.kind} className="new-sale__option-group">
            <p className="new-sale__option-kind" aria-hidden="true">
              {group.kind === "membership" ? "Memberships" : "Passes"}
            </p>
            {group.items.map((option) => (
              <label key={option.price.id} className="new-sale__option">
                <input
                  type="radio"
                  name="sale-product"
                  value={option.price.id}
                  checked={chosen === option.price.id}
                  onChange={() => {
                    setChosen(option.price.id);
                    setError(undefined);
                  }}
                />
                <span className="new-sale__option-name">{optionTitle(option, options)}</span>
                <span className="new-sale__option-facts">{optionFacts(option)}</span>
                <span className="new-sale__option-amount">{formatMoney(option.price.amount_minor, option.price.currency)}</span>
              </label>
            ))}
          </div>
        ))}
      </fieldset>
      <FieldError id="sale-product-error">{error}</FieldError>
    </SaleDialog>
  );
}

/* ---------- Record payment (before the sale exists) ---------- */

/**
 * Adds the payment the desk received. Nothing is sent until Create sale;
 * then Rails records the payment on the new sale.
 */
function DraftPaymentDialog({
  total,
  currency,
  onClose,
  onAdd,
}: {
  total: number;
  currency: string;
  onClose: () => void;
  onAdd: (payment: DraftPayment) => void;
}) {
  const [method, setMethod] = useState<Schemas["ManualPaymentMethod"]>("cash");
  const [amount, setAmount] = useState(() => minorToInput(total, currency));
  const [reference, setReference] = useState("");
  const [amountError, setAmountError] = useState<string | undefined>();

  return (
    <SaleDialog
      title="Record payment"
      meta={`${formatMoney(total, currency)} due`}
      wide
      pending={false}
      onClose={onClose}
      onSubmit={() => {
        const checked = checkPaymentAmount(amount, total, currency);
        if ("error" in checked) {
          setAmountError(checked.error);
          focusField("payment-amount");
          return;
        }
        onAdd({ method, amount_minor: checked.minor, reference });
      }}
      submit={(kbd) => (
        <Button type="submit" size="compact" aria-keyshortcuts="Meta+Enter Control+Enter">
          Add payment
          {kbd}
        </Button>
      )}
    >
      <PaymentFields
        currency={currency}
        balance_minor={total}
        method={method}
        amount={amount}
        reference={reference}
        amountError={amountError}
        onMethod={setMethod}
        onAmount={(value) => {
          setAmount(value);
          setAmountError(undefined);
        }}
        onReference={setReference}
      />
      <p className="sale-dialog__note">
        Records money the desk already received. Flowfokus does not charge cards or move money. It is saved when you create
        the sale.
      </p>
    </SaleDialog>
  );
}

/** The page while members and products load. */
export function NewSaleLoading() {
  return (
    <div className="page new-sale" role="status" aria-busy="true" aria-label="Loading new sale">
      <NewSaleHead />
      <div className="new-sale__main">
        {[0, 1].map((index) => (
          <div key={index} className="mx-section">
            <div className="mx-section__head" />
            <span className="skeleton-line" style={{ width: "60%" }} />
            <span className="skeleton-line skeleton-line--small" style={{ width: "40%" }} />
          </div>
        ))}
      </div>
      <div className="new-sale__side">
        <span className="skeleton-line skeleton-line--small" style={{ width: 80 }} />
        <span className="skeleton-block new-sale__skeleton-field" />
      </div>
    </div>
  );
}
