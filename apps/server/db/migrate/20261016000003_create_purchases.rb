class CreatePurchases < ActiveRecord::Migration[8.1]
  def change
    create_table :sales, id: :uuid do |t|
      t.uuid :organization_id, null: false
      t.uuid :member_id, null: false
      t.uuid :location_id, null: false
      t.references :created_by_user, type: :uuid, null: false, foreign_key: { to_table: :users }
      t.string :currency, null: false, limit: 3
      t.bigint :total_minor, null: false
      t.bigint :paid_minor, null: false, default: 0
      t.datetime :purchased_at, null: false
      t.string :idempotency_key, null: false
      t.string :request_fingerprint, null: false
      t.timestamps
      t.index [ :organization_id, :idempotency_key ], unique: true
      t.index [ :organization_id, :created_at ]
      t.index [ :member_id ]
      t.index [ :id, :organization_id ], unique: true
      t.check_constraint "total_minor >= 0", name: "sales_total_non_negative"
      t.check_constraint "paid_minor >= 0 AND paid_minor <= total_minor", name: "sales_paid_within_total"
      t.check_constraint "currency ~ '^[A-Z]{3}$'", name: "sales_currency_format"
    end
    add_foreign_key :sales, :organizations
    add_foreign_key :sales, :members, column: [ :member_id, :organization_id ], primary_key: [ :id, :organization_id ]
    add_foreign_key :sales, :locations, column: [ :location_id, :organization_id ], primary_key: [ :id, :organization_id ]

    # Immutable snapshot of what was bought.
    create_table :sale_line_items, id: :uuid do |t|
      t.uuid :organization_id, null: false
      t.uuid :sale_id, null: false
      t.uuid :price_id, null: false
      t.uuid :product_id, null: false
      t.string :product_name, null: false
      t.string :price_label, null: false
      t.integer :quantity, null: false, default: 1
      t.bigint :unit_amount_minor, null: false
      t.bigint :total_minor, null: false
      t.string :currency, null: false, limit: 3
      t.jsonb :terms, null: false
      t.timestamps
      t.index [ :sale_id ]
      t.index [ :price_id ]
      t.index [ :id, :organization_id ], unique: true
      t.check_constraint "quantity = 1", name: "sale_line_items_quantity_one"
      t.check_constraint "unit_amount_minor >= 0 AND total_minor = unit_amount_minor * quantity", name: "sale_line_items_total"
    end
    add_foreign_key :sale_line_items, :organizations
    add_foreign_key :sale_line_items, :sales, column: [ :sale_id, :organization_id ], primary_key: [ :id, :organization_id ]
    add_foreign_key :sale_line_items, :prices, column: [ :price_id, :organization_id ], primary_key: [ :id, :organization_id ]
    add_foreign_key :sale_line_items, :products, column: [ :product_id, :organization_id ], primary_key: [ :id, :organization_id ]

    create_table :payments, id: :uuid do |t|
      t.uuid :organization_id, null: false
      t.uuid :sale_id, null: false
      t.references :recorded_by_user, type: :uuid, null: false, foreign_key: { to_table: :users }
      t.bigint :amount_minor, null: false
      t.string :currency, null: false, limit: 3
      t.string :payment_method, null: false
      t.string :reference
      t.datetime :received_at, null: false
      t.string :idempotency_key, null: false
      t.string :request_fingerprint, null: false
      t.timestamps
      t.index [ :organization_id, :idempotency_key ], unique: true
      t.index [ :sale_id ]
      t.check_constraint "amount_minor > 0", name: "payments_amount_positive"
      t.check_constraint "payment_method IN ('cash', 'bank_transfer')", name: "payments_payment_method"
    end
    add_foreign_key :payments, :organizations
    add_foreign_key :payments, :sales, column: [ :sale_id, :organization_id ], primary_key: [ :id, :organization_id ]

    # Line items and payments are never updated. Corrections are new records.
    create_function :prevent_update
    create_trigger :sale_line_items_immutable, on: :sale_line_items
    create_trigger :payments_immutable, on: :payments
  end
end
