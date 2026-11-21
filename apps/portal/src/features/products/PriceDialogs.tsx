import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useToast } from "../../components/Toast";
import { Field, SubmitButton, describedBy } from "../../components/ui";
import { formatDuration, formatMoney } from "../../lib/format";
import { useAction } from "../../lib/hooks";
import { useOrganization } from "../../lib/organization";
import { createPrice } from "../../lib/staff.functions";
import { useRestoreFocus } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DialogFailure, SaleDialog } from "../sales/SaleDialogs";
import { checkPrice, priceSpec, type Product } from "./facts";

const sendPrice = (input: Parameters<typeof createPrice>[0]["data"]) => createPrice({ data: input });

/**
 * Adds a price to a product: an amount and a length, and a name if staff want
 * one. Rails never changes a price a sale may use, so this is the only way to
 * change what the product costs. The new price is on sale at once; the old
 * prices stay as they are, so staff take them off sale or archive them.
 */
export function AddPriceDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  useRestoreFocus();
  const organization = useOrganization();
  const currency = organization.currency;
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendPrice);
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("30");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"amount" | "days", string>>>({});

  const server = action.error?.code === "validation_failed" ? action.error.details : undefined;
  const amountError = errors.amount ?? server?.amount_minor?.join(", ");
  const daysError = errors.days ?? server?.duration_days?.join(", ");
  const otherError = action.error && !(server?.amount_minor || server?.duration_days) ? action.error : null;

  async function submit() {
    const found = checkPrice(amount, days, currency);
    setErrors(found);
    const spec = priceSpec(amount, days, currency);
    if (!spec || found.amount || found.days) return;
    const result = await action.run({ slug: organization.slug, id: product.id, ...spec, label: name.trim() || spec.label });
    if (result.ok) {
      toast.show({
        tone: "success",
        title: "Price added",
        body: `${formatMoney(spec.amount_minor, currency)} for ${formatDuration(spec.duration_days)} is on sale. Members who bought keep their price.`,
      });
      void router.invalidate();
      onClose();
    }
  }

  return (
    <SaleDialog
      title="Add price"
      meta={product.name}
      wide
      pending={action.pending}
      onClose={onClose}
      onSubmit={() => void submit()}
      submit={(kbd) => (
        <SubmitButton compact pending={action.pending} pendingLabel="Adding…" aria-keyshortcuts="Meta+Enter Control+Enter">
          Add price
          {kbd}
        </SubmitButton>
      )}
    >
      <Field id="price-amount" label="Price" error={amountError}>
        <span className="program-input program-input--suffix" data-invalid={amountError ? true : undefined}>
          <span className="program-input__unit" aria-hidden="true">
            {currency === "MYR" ? "RM" : currency}
          </span>
          <input
            id="price-amount"
            className="program-input__bare"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setErrors((current) => ({ ...current, amount: undefined }));
            }}
            aria-invalid={amountError ? true : undefined}
            aria-describedby={describedBy("price-amount", undefined, amountError)}
          />
        </span>
      </Field>
      <Field id="price-days" label={product.kind === "pass" ? "Valid for" : "Length"} error={daysError}>
        <span className="program-input program-input--suffix" data-invalid={daysError ? true : undefined}>
          <input
            id="price-days"
            className="program-input__bare"
            inputMode="numeric"
            autoComplete="off"
            value={days}
            onChange={(event) => {
              setDays(event.target.value);
              setErrors((current) => ({ ...current, days: undefined }));
            }}
            aria-invalid={daysError ? true : undefined}
            aria-describedby={describedBy("price-days", undefined, daysError)}
          />
          <span className="program-input__unit">days from fulfillment</span>
        </span>
      </Field>
      <Field id="price-name" label="Name (optional)">
        <Input id="price-name" className="program-input" autoComplete="off" maxLength={200} value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <DialogFailure title="The price was not added" error={otherError} next="Nothing was saved. Check the details and try again." />
    </SaleDialog>
  );
}
