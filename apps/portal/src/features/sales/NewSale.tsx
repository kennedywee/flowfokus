import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Icon } from "@/components/ui/icon";
import { Combobox } from "../../components/Combobox";
import { PageActions } from "../../components/PageActions";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import { FailureNotice, Kbd, Notice, SubmitButton, describedBy, initials } from "../../components/ui";
import { PAYMENT_METHOD_LABEL, PRODUCT_KIND_LABEL, formatMoney, minorToInput } from "../../lib/format";
import { useAction, useIdempotencyKey } from "../../lib/hooks";
import { useCan, useDeskLocation, useOrganization } from "../../lib/organization";
import type { Result } from "../../lib/result";
import { useModKeyLabel, useShortcut } from "../../lib/shortcuts";
import { useWide } from "../../lib/use-wide";
import { createSale, recordPayment } from "../../lib/staff.functions";
import { Section } from "../members/Section";
import { DetailHero, DetailLayout, HeroTile, PanelGroup } from "@/components/parts/DetailLayout";
import { CellStack, ListTable, ListTableBody, ListTableCell, ListTableLoading, ListTableRow, type ListColumn } from "@/components/parts/ListTable";
import { Tile } from "@/components/parts/marks";
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

const sendSale = (input: Parameters<typeof createSale>[0]["data"]) => createSale({ data: input });
const sendPayment = (input: Parameters<typeof recordPayment>[0]["data"]) => recordPayment({ data: input });

const icon = { "aria-hidden": true, focusable: false } as const;
const markIcon = { "aria-hidden": true, focusable: false } as const;
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
export function NewSale({ data, memberId, priceId }: { data: NewSaleData; memberId?: string; priceId?: string }) {
  const can = useCan();
  if (!can("purchases:create")) {
    return (
      <NewSaleLayout>
        <Notice tone="warning" title="You cannot sell">
          <p>Selling needs the purchases:create permission. Ask an owner to change your role.</p>
        </Notice>
      </NewSaleLayout>
    );
  }
  if (!data.members.ok || !data.products.ok) {
    return (
      <NewSaleLayout>
        {!data.members.ok ? <FailureNotice error={data.members.error} title="Members did not load" /> : null}
        {!data.products.ok ? <FailureNotice error={data.products.error} title="Products did not load" /> : null}
      </NewSaleLayout>
    );
  }
  return <NewSaleForm members={data.members.data} options={saleOptions(data.products.data)} initialMemberId={memberId} initialPriceId={priceId} />;
}

/**
 * The page frame of a sale: ledger rules behind a hero, then the content, with
 * an optional right panel. Below 1100px the panel moves into the page after the
 * hero, so the document order is the order on screen: Member and Location, the
 * form, then the action. `actions` goes last for that reason.
 */
function NewSaleLayout({ panel, actions, children }: { panel?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const wide = useWide();
  return (
    <DetailLayout record="sale" className="new-sale" panel={wide ? panel : undefined}>
      <DetailHero tile={<HeroTile icon="sales" />} title="New sale" />
      {!wide && panel ? (
        <aside className="detail__panel" aria-label="Details">
          {panel}
        </aside>
      ) : null}
      {children}
      {actions ? <PageActions>{actions}</PageActions> : null}
    </DetailLayout>
  );
}

function NewSaleForm({
  members,
  options,
  initialMemberId,
  initialPriceId,
}: {
  members: Schemas["Member"][];
  options: SaleOption[];
  initialMemberId?: string;
  initialPriceId?: string;
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
  const preselectedPrice = options.some((item) => item.price.id === initialPriceId) ? initialPriceId! : "";
  const [priceId, setPriceId] = useState(preselectedPrice);
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

  const dirty = Boolean(priceId !== preselectedPrice || payment || memberId !== preselected);
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

  const panel = (
    <>
      <MemberPanel
        members={members}
        member={member}
        error={memberError}
        pending={pending}
        onChoose={(value) => {
          moveFocus.current = true;
          setMemberId(value);
          setLocal((current) => ({ ...current, member: undefined }));
          edited();
        }}
        onClear={() => {
          moveFocus.current = true;
          setMemberId("");
          edited();
        }}
      />
      <div className="new-sale__group">
        <div className="panel-group__head">
          <label htmlFor="sale-location" className="panel-group__title">
            Location
          </label>
        </div>
        <div className="new-sale__select">
          <Icon name="location" {...markIcon} />
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
    </>
  );

  return (
    <NewSaleLayout
      panel={panel}
      actions={
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
      }
    >
      <form id={FORM_ID} ref={form} className="new-sale__form" onSubmit={onSubmit} noValidate>
        {error && !fieldError ? <FailureNotice error={error} title="The sale was not created" /> : null}

        <Section
          id="products"
          title="Products"
          action={
            option ? (
              <Button type="button" variant="secondary" size="compact" onClick={() => setDialog("product")}>
                Change
              </Button>
            ) : options.length ? (
              <Button
                id="sale-add-product"
                type="button"
                variant="secondary"
                size="compact"
                aria-describedby={productError ? "sale-add-product-error" : undefined}
                onClick={() => setDialog("product")}
              >
                <Icon name="plus" size={14} {...markIcon} />
                Product
              </Button>
            ) : null
          }
        >
          {option ? (
            <ListTable label="Products" density="two-line" className="list-table--bare new-sale__lines" columns={LINE_COLUMNS}>
              <ListTableBody>
                <ListTableRow>
                  <ListTableCell>
                    <CellStack
                      lead={
                        <Tile square>
                          <ProductIcon kind={option.kind} />
                        </Tile>
                      }
                      title={optionTitle(option, options)}
                      sub={`${PRODUCT_KIND_LABEL[option.kind]} · ${optionFacts(option)}`}
                    />
                  </ListTableCell>
                  <ListTableCell align="end" className="cell-figure">
                    {formatMoney(option.price.amount_minor, option.price.currency)}
                  </ListTableCell>
                  <ListTableCell align="end">
                    <RemoveButton label={`Remove ${option.product.name}`} disabled={pending} onClick={() => choosePrice("")} />
                  </ListTableCell>
                </ListTableRow>
              </ListTableBody>
            </ListTable>
          ) : options.length === 0 ? (
            <div className="member-empty">
              <p>No membership or pass has a price to sell.</p>
              {can("products:update") ? (
                <Link to="/$org/products" params={{ org: organization.slug }} className="new-sale__link">
                  Open Products
                </Link>
              ) : null}
            </div>
          ) : (
            <p className="member-empty" data-invalid={productError ? true : undefined}>
              No product yet
            </p>
          )}
          <FieldError id="sale-add-product-error" className="new-sale__error">
            {productError}
          </FieldError>
          {option ? (
            <dl className="sale-sum">
              <div className="sale-sum__row">
                <dt>Total</dt>
                <dd>{formatMoney(total, currency)}</dd>
              </div>
            </dl>
          ) : null}
        </Section>

        <Section
          id="payment"
          title="Payment"
          action={
            canPay && !payment ? (
              <Button type="button" variant="secondary" size="compact" disabled={!option || pending} onClick={() => setDialog("payment")}>
                <Icon name="plus" size={14} {...markIcon} />
                Record payment
              </Button>
            ) : null
          }
        >
          {!option ? (
            <p className="member-empty">Add a product to record a payment.</p>
          ) : payment ? (
            <ListTable label="Payment" density="two-line" className="list-table--bare new-sale__lines" columns={LINE_COLUMNS}>
              <ListTableBody>
                <PaymentRow payment={payment} currency={currency} disabled={pending} onRemove={() => setPayment(null)} />
              </ListTableBody>
            </ListTable>
          ) : (
            <p className="member-empty">No payment yet</p>
          )}
          {option ? (
            <dl className="sale-sum" data-state={balance > 0 ? "due" : undefined}>
              <div className="sale-sum__row">
                <dt>Balance due</dt>
                <dd>{formatMoney(balance, currency)}</dd>
              </div>
            </dl>
          ) : null}
        </Section>
      </form>

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
    </NewSaleLayout>
  );
}

const LINE_COLUMNS: ListColumn[] = [
  { id: "line", label: "Line" },
  { id: "amount", label: "Amount", width: "112px", align: "end" },
  { id: "remove", label: "Remove", width: "32px", align: "end", hideLabel: true },
];

/**
 * Member in the right panel: a search of name and email, or the chosen member
 * with a button to change. With no members it points to New member.
 */
function MemberPanel({
  members,
  member,
  error,
  pending,
  onChoose,
  onClear,
}: {
  members: Schemas["Member"][];
  member: Schemas["Member"] | undefined;
  error: string | undefined;
  pending: boolean;
  onChoose: (memberId: string) => void;
  onClear: () => void;
}) {
  const organization = useOrganization();
  if (member) {
    return (
      <div className="new-sale__group">
        <div className="panel-group__head">
          <h2 className="panel-group__title" id="sale-member-label">
            Member
          </h2>
          <button type="button" id="sale-member" className="new-sale__icon-button" disabled={pending} onClick={onClear}>
            <Icon name="close" {...markIcon} />
            <span className="visually-hidden">Change member: {member.name}</span>
          </button>
        </div>
        <div className="new-sale__member">
          <Tile size="small">{initials(member.name)}</Tile>
          <div className="new-sale__member-text">
            <span className="new-sale__member-name">{member.name}</span>
            <span className="new-sale__member-sub">{member.email}</span>
          </div>
        </div>
      </div>
    );
  }
  if (members.length === 0) {
    return (
      <PanelGroup title="Member">
        <p className="new-sale__hint">No members yet.</p>
        <Link to="/$org/members/new" params={{ org: organization.slug }} className="new-sale__link">
          New member
        </Link>
      </PanelGroup>
    );
  }
  return (
    <div className="new-sale__group">
      <Combobox
        id="sale-member"
        label="Member"
        placeholder="Search name or email"
        emptyText="No member matches. Check the spelling."
        options={members.map((item) => ({ value: item.id, label: item.name, detail: item.email }))}
        value={null}
        onChange={(value) => {
          if (value) onChoose(value);
        }}
        error={error}
        invalid={Boolean(error)}
        required
      />
    </div>
  );
}

function ProductIcon({ kind }: { kind: SaleKind }) {
  const iconName = KIND_ICON[kind];
  return <Icon name={iconName} {...markIcon} />;
}

function RemoveButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" className="new-sale__icon-button" disabled={disabled} onClick={onClick}>
      <Icon name="close" {...markIcon} />
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
  const label = PAYMENT_METHOD_LABEL[payment.method];
  return (
    <ListTableRow>
      <ListTableCell>
        <CellStack title={label} sub={payment.reference.trim() ? `Ref. ${payment.reference.trim()}` : undefined} />
      </ListTableCell>
      <ListTableCell align="end" className="cell-figure">
        {formatMoney(payment.amount_minor, currency)}
      </ListTableCell>
      <ListTableCell align="end">
        <RemoveButton label={`Remove the ${label.toLowerCase()} payment`} disabled={disabled} onClick={onRemove} />
      </ListTableCell>
    </ListTableRow>
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
      className="new-sale-dialog"
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
        <Icon name="search" className="list-search__icon" aria-hidden="true" focusable="false" />
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
      className="new-sale-dialog"
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
    <NewSaleLayout
      panel={
        <div role="status" aria-busy="true" aria-label="Loading member and location">
          <span className="skeleton-block new-sale__skeleton-field" />
        </div>
      }
    >
      <div role="status" aria-busy="true" aria-label="Loading new sale" className="sale-loading">
        <ListTable label="Products (loading)" density="two-line" className="list-table--bare" columns={LINE_COLUMNS}>
          <ListTableLoading rows={2} label="Loading products" />
        </ListTable>
      </div>
    </NewSaleLayout>
  );
}
