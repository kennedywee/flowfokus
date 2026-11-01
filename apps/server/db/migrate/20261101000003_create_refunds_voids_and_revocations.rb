# Refunds return money against one payment. Voids cancel a sale that delivered
# nothing and kept no money. Revocations end the access from one delivery.
# Each is a separate recorded fact with an actor and a reason. None of them
# deletes or edits the original sale, payment, period, or entitlement terms.
class CreateRefundsVoidsAndRevocations < ActiveRecord::Migration[8.1]
  def change
    create_table :refunds, id: :uuid do |t|
      t.references :organization, type: :uuid, null: false, foreign_key: true, index: false
      t.uuid :sale_id, null: false
      t.uuid :payment_id, null: false
      t.references :recorded_by_user, type: :uuid, null: false, foreign_key: { to_table: :users }
      t.bigint :amount_minor, null: false
      t.string :currency, limit: 3, null: false
      t.text :reason, null: false
      t.datetime :refunded_at, null: false
      t.string :idempotency_key, null: false
      t.string :request_fingerprint, null: false
      t.timestamps

      t.index :sale_id
      t.index :payment_id
      t.index %i[organization_id idempotency_key], unique: true
      t.check_constraint "amount_minor > 0", name: "refunds_amount_positive"
      t.check_constraint "length(btrim(reason)) > 0", name: "refunds_reason_present"
    end
    add_index :payments, %i[id organization_id], unique: true
    add_foreign_key :refunds, :sales, column: %i[sale_id organization_id], primary_key: %i[id organization_id]
    add_foreign_key :refunds, :payments, column: %i[payment_id organization_id], primary_key: %i[id organization_id]
    create_trigger :refunds_immutable, on: :refunds

    add_column :sales, :refunded_minor, :bigint, null: false, default: 0
    add_check_constraint :sales, "refunded_minor >= 0 AND refunded_minor <= paid_minor", name: "sales_refunded_within_paid"
    add_column :sales, :voided_at, :datetime
    add_reference :sales, :voided_by_user, type: :uuid, foreign_key: { to_table: :users }
    add_column :sales, :void_reason, :text
    add_check_constraint :sales,
      "(voided_at IS NULL AND voided_by_user_id IS NULL AND void_reason IS NULL) OR " \
      "(voided_at IS NOT NULL AND voided_by_user_id IS NOT NULL AND void_reason IS NOT NULL AND length(btrim(void_reason)) > 0)",
      name: "sales_void_shape"

    add_column :fulfillments, :revoked_at, :datetime
    add_reference :fulfillments, :revoked_by_user, type: :uuid, foreign_key: { to_table: :users }
    add_column :fulfillments, :revoke_reason, :text
    add_check_constraint :fulfillments,
      "(revoked_at IS NULL AND revoked_by_user_id IS NULL AND revoke_reason IS NULL) OR " \
      "(revoked_at IS NOT NULL AND revoked_by_user_id IS NOT NULL AND revoke_reason IS NOT NULL AND length(btrim(revoke_reason)) > 0)",
      name: "fulfillments_revoke_shape"

    # A revoked period no longer blocks a new one over the same dates.
    add_column :membership_periods, :revoked_at, :datetime
    remove_exclusion_constraint :membership_periods, "membership_id WITH =, tsrange(starts_at, ends_at, '[)') WITH &&",
      using: :gist, name: "membership_periods_no_overlap"
    add_exclusion_constraint :membership_periods, "membership_id WITH =, tsrange(starts_at, ends_at, '[)') WITH &&",
      using: :gist, where: "revoked_at IS NULL", name: "membership_periods_no_overlap"

    add_column :entitlements, :revoked_at, :datetime
  end
end
