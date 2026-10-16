class CreateCatalog < ActiveRecord::Migration[8.1]
  def change
    create_table :products, id: :uuid do |t|
      t.references :organization, type: :uuid, null: false, foreign_key: true, index: false
      t.string :name, null: false
      t.text :description
      t.string :kind, null: false, default: "membership"
      t.boolean :published, null: false, default: false
      t.integer :position, null: false, default: 0
      t.timestamps
      t.index [ :organization_id, :position ]
      t.index [ :id, :organization_id ], unique: true
      t.check_constraint "kind IN ('membership')", name: "products_kind"
    end

    create_table :product_benefits, id: :uuid do |t|
      t.uuid :organization_id, null: false
      t.uuid :product_id, null: false
      t.uuid :location_id
      t.string :kind, null: false, default: "gym_access"
      t.string :name, null: false
      t.integer :usage_limit
      t.timestamps
      t.index [ :product_id ]
      t.check_constraint "kind IN ('gym_access')", name: "product_benefits_kind"
      t.check_constraint "usage_limit IS NULL OR usage_limit > 0", name: "product_benefits_usage_limit_positive"
    end
    add_foreign_key :product_benefits, :organizations
    add_foreign_key :product_benefits, :products, column: [ :product_id, :organization_id ], primary_key: [ :id, :organization_id ]
    add_foreign_key :product_benefits, :locations, column: [ :location_id, :organization_id ], primary_key: [ :id, :organization_id ]

    create_table :prices, id: :uuid do |t|
      t.uuid :organization_id, null: false
      t.uuid :product_id, null: false
      t.string :label, null: false
      t.bigint :amount_minor, null: false
      t.string :currency, null: false, limit: 3
      t.integer :duration_days, null: false
      t.boolean :available, null: false, default: true
      t.datetime :archived_at
      t.timestamps
      t.index [ :product_id ]
      t.index [ :id, :organization_id ], unique: true
      t.check_constraint "amount_minor >= 0", name: "prices_amount_non_negative"
      t.check_constraint "currency ~ '^[A-Z]{3}$'", name: "prices_currency_format"
      t.check_constraint "duration_days > 0", name: "prices_duration_positive"
    end
    add_foreign_key :prices, :organizations
    add_foreign_key :prices, :products, column: [ :product_id, :organization_id ], primary_key: [ :id, :organization_id ]

    # Amount, currency, product, and terms never change. A change creates a new price.
    create_function :prevent_price_term_changes
    create_trigger :prices_immutable_terms, on: :prices
  end
end
