# Programs people attend, their dated occurrences, bookings, and online
# checkout. Tickets and passes join the same sale, payment, and fulfillment
# flow as memberships. See docs/superpowers/specs/2026-11-03-programs-and-bookings-design.md.
class CreateProgramsAndBookings < ActiveRecord::Migration[8.1]
  PROGRAM_KINDS = "('group_class', 'event', 'appointment')".freeze

  def change
    create_table :programs, id: :uuid do |t|
      t.uuid :organization_id, null: false
      t.uuid :location_id, null: false
      t.string :name, null: false
      t.text :description
      t.string :kind, null: false
      t.integer :capacity, null: false
      t.integer :duration_minutes, null: false
      t.string :host_name
      t.boolean :published, null: false, default: false
      t.timestamps
      t.index %i[organization_id name]
      t.index %i[id organization_id], unique: true
      t.check_constraint "kind IN #{PROGRAM_KINDS}", name: "programs_kind"
      t.check_constraint "capacity > 0", name: "programs_capacity_positive"
      t.check_constraint "duration_minutes > 0 AND duration_minutes <= 1440", name: "programs_duration_range"
    end
    add_foreign_key :programs, :organizations
    add_foreign_key :programs, :locations, column: %i[location_id organization_id], primary_key: %i[id organization_id]

    create_table :occurrences, id: :uuid do |t|
      t.uuid :organization_id, null: false
      t.uuid :program_id, null: false
      t.datetime :starts_at, null: false
      t.datetime :ends_at, null: false
      t.integer :capacity, null: false
      t.datetime :cancelled_at
      t.text :cancel_reason
      t.timestamps
      t.index %i[organization_id starts_at]
      t.index %i[program_id starts_at], unique: true
      t.index %i[id organization_id], unique: true
      t.check_constraint "ends_at > starts_at", name: "occurrences_positive_length"
      t.check_constraint "capacity > 0", name: "occurrences_capacity_positive"
      t.check_constraint "(cancelled_at IS NULL AND cancel_reason IS NULL) OR " \
                         "(cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL AND length(btrim(cancel_reason)) > 0)",
        name: "occurrences_cancel_shape"
    end
    add_foreign_key :occurrences, :organizations
    add_foreign_key :occurrences, :programs, column: %i[program_id organization_id], primary_key: %i[id organization_id]

    # Products: passes and tickets. A ticket keeps the program it was made from.
    remove_check_constraint :products, "kind IN ('membership')", name: "products_kind"
    add_check_constraint :products, "kind IN ('membership', 'pass', 'ticket')", name: "products_kind"
    add_column :products, :program_id, :uuid
    add_index :products, :program_id
    add_foreign_key :products, :programs, column: %i[program_id organization_id], primary_key: %i[id organization_id]
    add_check_constraint :products, "(kind = 'ticket') = (program_id IS NOT NULL)", name: "products_ticket_program"

    # A ticket's validity comes from its occurrence, so it has no duration.
    change_column_null :prices, :duration_days, true
    remove_check_constraint :prices, "duration_days > 0", name: "prices_duration_positive"
    add_check_constraint :prices, "duration_days IS NULL OR duration_days > 0", name: "prices_duration_positive"

    # Program access: any program, all programs of one kind, or selected programs.
    [ :product_benefits, :entitlements ].each do |table|
      remove_check_constraint table, "kind = 'gym_access'", name: "#{table}_kind"
      add_check_constraint table, "kind IN ('gym_access', 'program_access')", name: "#{table}_kind"
      add_column table, :program_ids, :uuid, array: true, null: false, default: []
      add_column table, :program_kind, :string
      add_check_constraint table, "program_kind IS NULL OR program_kind IN #{PROGRAM_KINDS}", name: "#{table}_program_kind"
      add_check_constraint table, "kind = 'program_access' OR (program_ids = '{}' AND program_kind IS NULL)",
        name: "#{table}_gym_access_unscoped"
    end
    add_column :entitlements, :occurrence_id, :uuid
    add_foreign_key :entitlements, :occurrences, column: %i[occurrence_id organization_id], primary_key: %i[id organization_id]
    add_check_constraint :entitlements, "occurrence_id IS NULL OR kind = 'program_access'", name: "entitlements_occurrence_program_access"

    # Sales: online sales have no staff actor and no sale location.
    add_column :sales, :channel, :string, null: false, default: "desk"
    change_column_null :sales, :created_by_user_id, true
    change_column_null :sales, :location_id, true
    add_check_constraint :sales,
      "(channel = 'desk' AND created_by_user_id IS NOT NULL AND location_id IS NOT NULL) OR " \
      "(channel = 'online' AND created_by_user_id IS NULL)",
      name: "sales_channel_shape"
    add_column :sales, :occurrence_id, :uuid
    add_index :sales, :occurrence_id
    add_foreign_key :sales, :occurrences, column: %i[occurrence_id organization_id], primary_key: %i[id organization_id]

    # Payments: online payments come from a provider, not a person.
    change_column_null :payments, :recorded_by_user_id, true
    add_column :payments, :provider, :string
    remove_check_constraint :payments, "payment_method IN ('cash', 'bank_transfer')", name: "payments_payment_method"
    add_check_constraint :payments, "payment_method IN ('cash', 'bank_transfer', 'online')", name: "payments_payment_method"
    add_check_constraint :payments,
      "(payment_method = 'online' AND provider IS NOT NULL AND recorded_by_user_id IS NULL) OR " \
      "(payment_method <> 'online' AND provider IS NULL AND recorded_by_user_id IS NOT NULL)",
      name: "payments_source_shape"

    # Fulfillment: passes and tickets have no membership. Online delivery has no staff actor.
    change_column_null :fulfillments, :membership_id, true
    change_column_null :fulfillments, :fulfilled_by_user_id, true

    create_table :checkouts, id: :uuid do |t|
      t.uuid :organization_id, null: false
      t.uuid :member_id, null: false
      t.uuid :price_id, null: false
      t.uuid :occurrence_id
      t.uuid :sale_id
      t.bigint :amount_minor, null: false
      t.string :currency, limit: 3, null: false
      t.string :provider, null: false
      t.string :provider_reference, null: false
      t.string :status, null: false, default: "open"
      t.datetime :expires_at, null: false
      t.datetime :completed_at
      t.string :idempotency_key, null: false
      t.string :request_fingerprint, null: false
      t.timestamps
      t.index %i[organization_id idempotency_key], unique: true
      t.index %i[provider provider_reference], unique: true
      t.index :member_id
      t.index :sale_id, unique: true
      t.index %i[id organization_id], unique: true
      t.check_constraint "amount_minor >= 0", name: "checkouts_amount_non_negative"
      t.check_constraint "status IN ('open', 'paid', 'cancelled')", name: "checkouts_status"
      t.check_constraint "(status = 'paid') = (sale_id IS NOT NULL AND completed_at IS NOT NULL)", name: "checkouts_paid_shape"
    end
    add_foreign_key :checkouts, :organizations
    add_foreign_key :checkouts, :members, column: %i[member_id organization_id], primary_key: %i[id organization_id]
    add_foreign_key :checkouts, :prices, column: %i[price_id organization_id], primary_key: %i[id organization_id]
    add_foreign_key :checkouts, :occurrences, column: %i[occurrence_id organization_id], primary_key: %i[id organization_id]
    add_foreign_key :checkouts, :sales, column: %i[sale_id organization_id], primary_key: %i[id organization_id]

    # A spot in one occurrence. Confirmed bookings always use one entitlement.
    # A held booking waits for its checkout and stops counting when the hold ends.
    create_table :bookings, id: :uuid do |t|
      t.uuid :organization_id, null: false
      t.uuid :member_id, null: false
      t.uuid :occurrence_id, null: false
      t.uuid :entitlement_id
      t.uuid :checkout_id
      t.uuid :sale_id
      t.references :booked_by_user, type: :uuid, foreign_key: { to_table: :users }
      t.datetime :held_until
      t.datetime :confirmed_at
      t.datetime :cancelled_at
      t.text :cancel_reason
      t.references :cancelled_by_user, type: :uuid, foreign_key: { to_table: :users }
      t.datetime :attended_at
      t.references :attended_by_user, type: :uuid, foreign_key: { to_table: :users }
      t.timestamps
      t.index %i[occurrence_id member_id], unique: true, where: "cancelled_at IS NULL", name: "index_bookings_one_live_per_member"
      t.index %i[member_id created_at]
      t.index :entitlement_id
      t.index :checkout_id, unique: true
      t.index %i[id organization_id], unique: true
      t.check_constraint "(confirmed_at IS NOT NULL AND entitlement_id IS NOT NULL) OR " \
                         "(confirmed_at IS NULL AND held_until IS NOT NULL AND checkout_id IS NOT NULL)",
        name: "bookings_confirmed_or_held"
      t.check_constraint "(cancelled_at IS NULL AND cancel_reason IS NULL) OR " \
                         "(cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL AND length(btrim(cancel_reason)) > 0)",
        name: "bookings_cancel_shape"
      t.check_constraint "attended_at IS NULL OR (confirmed_at IS NOT NULL AND cancelled_at IS NULL)", name: "bookings_attended_confirmed"
    end
    add_foreign_key :bookings, :organizations
    add_foreign_key :bookings, :members, column: %i[member_id organization_id], primary_key: %i[id organization_id]
    add_foreign_key :bookings, :occurrences, column: %i[occurrence_id organization_id], primary_key: %i[id organization_id]
    add_foreign_key :bookings, :entitlements, column: %i[entitlement_id organization_id], primary_key: %i[id organization_id]
    add_foreign_key :bookings, :checkouts, column: %i[checkout_id organization_id], primary_key: %i[id organization_id]
    add_foreign_key :bookings, :sales, column: %i[sale_id organization_id], primary_key: %i[id organization_id]

    # A use comes from a check-in or a booking. A returned use is marked, never deleted.
    change_column_null :entitlement_usages, :check_in_id, true
    add_column :entitlement_usages, :booking_id, :uuid
    add_column :entitlement_usages, :returned_at, :datetime
    add_index :entitlement_usages, :booking_id, unique: true
    add_foreign_key :entitlement_usages, :bookings, column: %i[booking_id organization_id], primary_key: %i[id organization_id]
    add_check_constraint :entitlement_usages, "(check_in_id IS NULL) <> (booking_id IS NULL)", name: "entitlement_usages_one_source"
    add_check_constraint :entitlement_usages, "returned_at IS NULL OR booking_id IS NOT NULL", name: "entitlement_usages_only_bookings_return"
  end
end
