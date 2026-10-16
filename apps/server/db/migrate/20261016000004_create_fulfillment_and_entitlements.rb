class CreateFulfillmentAndEntitlements < ActiveRecord::Migration[8.1]
  def change
    create_table :memberships, id: :uuid do |t|
      t.uuid :organization_id, null: false
      t.uuid :member_id, null: false
      t.timestamps
      t.index [ :organization_id, :member_id ], unique: true
      t.index [ :id, :organization_id ], unique: true
    end
    add_foreign_key :memberships, :organizations
    add_foreign_key :memberships, :members, column: [ :member_id, :organization_id ], primary_key: [ :id, :organization_id ]

    create_table :fulfillments, id: :uuid do |t|
      t.uuid :organization_id, null: false
      t.uuid :sale_line_item_id, null: false
      t.uuid :member_id, null: false
      t.uuid :membership_id, null: false
      t.references :fulfilled_by_user, type: :uuid, null: false, foreign_key: { to_table: :users }
      t.datetime :fulfilled_at, null: false
      t.timestamps
      t.index [ :sale_line_item_id ], unique: true
      t.index [ :membership_id ]
      t.index [ :id, :organization_id ], unique: true
    end
    add_foreign_key :fulfillments, :organizations
    add_foreign_key :fulfillments, :sale_line_items, column: [ :sale_line_item_id, :organization_id ], primary_key: [ :id, :organization_id ]
    add_foreign_key :fulfillments, :members, column: [ :member_id, :organization_id ], primary_key: [ :id, :organization_id ]
    add_foreign_key :fulfillments, :memberships, column: [ :membership_id, :organization_id ], primary_key: [ :id, :organization_id ]

    create_table :membership_periods, id: :uuid do |t|
      t.uuid :organization_id, null: false
      t.uuid :membership_id, null: false
      t.uuid :fulfillment_id, null: false
      t.datetime :starts_at, null: false
      t.datetime :ends_at, null: false
      t.timestamps
      t.index [ :fulfillment_id ], unique: true
      t.index [ :membership_id, :starts_at ]
      t.index [ :id, :organization_id ], unique: true
      t.check_constraint "ends_at > starts_at", name: "membership_periods_positive_length"
      # Half-open UTC ranges: consecutive periods may share a boundary instant.
      t.exclusion_constraint "membership_id WITH =, tsrange(starts_at, ends_at, '[)') WITH &&",
        using: :gist, name: "membership_periods_no_overlap"
    end
    add_foreign_key :membership_periods, :organizations
    add_foreign_key :membership_periods, :memberships, column: [ :membership_id, :organization_id ], primary_key: [ :id, :organization_id ]
    add_foreign_key :membership_periods, :fulfillments, column: [ :fulfillment_id, :organization_id ], primary_key: [ :id, :organization_id ]

    create_table :benefit_grants, id: :uuid do |t|
      t.uuid :organization_id, null: false
      t.uuid :member_id, null: false
      t.uuid :fulfillment_id, null: false
      t.uuid :membership_period_id
      t.string :origin, null: false, default: "purchase"
      t.datetime :granted_at, null: false
      t.timestamps
      t.index [ :fulfillment_id ], unique: true
      t.index [ :member_id ]
      t.index [ :id, :organization_id ], unique: true
      t.check_constraint "origin IN ('purchase')", name: "benefit_grants_origin"
    end
    add_foreign_key :benefit_grants, :organizations
    add_foreign_key :benefit_grants, :members, column: [ :member_id, :organization_id ], primary_key: [ :id, :organization_id ]
    add_foreign_key :benefit_grants, :fulfillments, column: [ :fulfillment_id, :organization_id ], primary_key: [ :id, :organization_id ]
    add_foreign_key :benefit_grants, :membership_periods, column: [ :membership_period_id, :organization_id ], primary_key: [ :id, :organization_id ]

    create_table :entitlements, id: :uuid do |t|
      t.uuid :organization_id, null: false
      t.uuid :benefit_grant_id, null: false
      t.uuid :member_id, null: false
      t.uuid :location_id
      t.string :kind, null: false
      t.string :name, null: false
      t.datetime :starts_at, null: false
      t.datetime :ends_at, null: false
      t.integer :usage_limit
      t.integer :used_count, null: false, default: 0
      t.timestamps
      t.index [ :member_id, :ends_at ]
      t.index [ :benefit_grant_id ]
      t.index [ :id, :organization_id ], unique: true
      t.check_constraint "ends_at > starts_at", name: "entitlements_positive_length"
      t.check_constraint "kind IN ('gym_access')", name: "entitlements_kind"
      t.check_constraint "usage_limit IS NULL OR usage_limit > 0", name: "entitlements_usage_limit_positive"
      t.check_constraint "used_count >= 0 AND (usage_limit IS NULL OR used_count <= usage_limit)", name: "entitlements_used_within_limit"
    end
    add_foreign_key :entitlements, :organizations
    add_foreign_key :entitlements, :benefit_grants, column: [ :benefit_grant_id, :organization_id ], primary_key: [ :id, :organization_id ]
    add_foreign_key :entitlements, :members, column: [ :member_id, :organization_id ], primary_key: [ :id, :organization_id ]
    add_foreign_key :entitlements, :locations, column: [ :location_id, :organization_id ], primary_key: [ :id, :organization_id ]

    create_table :check_ins, id: :uuid do |t|
      t.uuid :organization_id, null: false
      t.uuid :member_id, null: false
      t.uuid :location_id, null: false
      t.uuid :entitlement_id
      t.references :recorded_by_user, type: :uuid, null: false, foreign_key: { to_table: :users }
      t.string :entry_method, null: false, default: "staff"
      t.string :result, null: false
      t.string :denial_reason
      t.datetime :checked_in_at, null: false
      t.string :idempotency_key, null: false
      t.string :request_fingerprint, null: false
      t.timestamps
      t.index [ :organization_id, :idempotency_key ], unique: true
      t.index [ :organization_id, :checked_in_at ]
      t.index [ :member_id, :checked_in_at ]
      t.index [ :id, :organization_id ], unique: true
      t.check_constraint "entry_method IN ('staff')", name: "check_ins_entry_method"
      t.check_constraint "result IN ('granted', 'denied')", name: "check_ins_result"
      t.check_constraint "(result = 'granted' AND denial_reason IS NULL AND entitlement_id IS NOT NULL) OR " \
                         "(result = 'denied' AND denial_reason IS NOT NULL AND entitlement_id IS NULL)",
        name: "check_ins_result_shape"
      t.check_constraint "denial_reason IS NULL OR denial_reason IN ('no_entitlement', 'location_not_allowed', 'usage_limit_reached')",
        name: "check_ins_denial_reason"
    end
    add_foreign_key :check_ins, :organizations
    add_foreign_key :check_ins, :members, column: [ :member_id, :organization_id ], primary_key: [ :id, :organization_id ]
    add_foreign_key :check_ins, :locations, column: [ :location_id, :organization_id ], primary_key: [ :id, :organization_id ]
    add_foreign_key :check_ins, :entitlements, column: [ :entitlement_id, :organization_id ], primary_key: [ :id, :organization_id ]

    # One usage per granted check-in. Unlimited rights still record usage.
    create_table :entitlement_usages, id: :uuid do |t|
      t.uuid :organization_id, null: false
      t.uuid :entitlement_id, null: false
      t.uuid :check_in_id, null: false
      t.datetime :used_at, null: false
      t.timestamps
      t.index [ :check_in_id ], unique: true
      t.index [ :entitlement_id ]
    end
    add_foreign_key :entitlement_usages, :organizations
    add_foreign_key :entitlement_usages, :entitlements, column: [ :entitlement_id, :organization_id ], primary_key: [ :id, :organization_id ]
    add_foreign_key :entitlement_usages, :check_ins, column: [ :check_in_id, :organization_id ], primary_key: [ :id, :organization_id ]
  end
end
