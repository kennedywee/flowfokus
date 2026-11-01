# Staff with purchases:fulfill_unpaid can deliver before full payment. The
# fulfillment records why, and the balance still due at that moment.
class AddEarlyDeliveryToFulfillments < ActiveRecord::Migration[8.1]
  def change
    add_column :fulfillments, :early_reason, :text
    add_column :fulfillments, :unpaid_minor, :bigint, null: false, default: 0
    add_check_constraint :fulfillments,
      "(unpaid_minor = 0 AND early_reason IS NULL) OR (unpaid_minor > 0 AND early_reason IS NOT NULL AND length(btrim(early_reason)) > 0)",
      name: "fulfillments_early_reason"
  end
end
