# One ticket purchase can book several spots. The buyer (holder) pays and
# owns the right; each booking names who attends: a member or a guest.
# Staff setup writes for programs and ticket prices become retry-safe.
class AddGroupTicketsAndSetupIdempotency < ActiveRecord::Migration[8.1]
  MAX_QUANTITY = 10

  def change
    # Sale lines: a ticket line can hold up to ten spots. Other kinds stay at one.
    remove_check_constraint :sale_line_items, "quantity = 1", name: "sale_line_items_quantity_one"
    add_check_constraint :sale_line_items, "quantity BETWEEN 1 AND #{MAX_QUANTITY}", name: "sale_line_items_quantity_range"

    # Who attends each spot of a ticket sale, in order. Empty means the buyer alone.
    add_column :sales, :attendees, :jsonb, null: false, default: []
    add_column :checkouts, :quantity, :integer, null: false, default: 1
    add_column :checkouts, :attendees, :jsonb, null: false, default: []
    add_check_constraint :checkouts, "quantity BETWEEN 1 AND #{MAX_QUANTITY}", name: "checkouts_quantity_range"

    # Bookings: the holder's right pays for the spot; the attendee takes it.
    # An attendee is a member, or a guest known only by name.
    add_column :bookings, :holder_member_id, :uuid
    add_column :bookings, :guest_name, :string
    add_column :bookings, :guest_email, :string
    reversible do |dir|
      dir.up { execute "UPDATE bookings SET holder_member_id = member_id" }
    end
    change_column_null :bookings, :holder_member_id, false
    change_column_null :bookings, :member_id, true
    add_index :bookings, %i[holder_member_id created_at]
    add_foreign_key :bookings, :members, column: %i[holder_member_id organization_id], primary_key: %i[id organization_id]
    add_check_constraint :bookings,
      "(member_id IS NOT NULL AND guest_name IS NULL AND guest_email IS NULL) OR " \
      "(member_id IS NULL AND guest_name IS NOT NULL AND length(btrim(guest_name)) > 0)",
      name: "bookings_member_or_guest"

    # A group checkout holds several bookings.
    remove_index :bookings, :checkout_id, unique: true
    add_index :bookings, :checkout_id

    # Retry-safe staff setup: the same key returns the first record.
    [ :programs, :prices ].each do |table|
      add_column table, :idempotency_key, :string
      add_column table, :request_fingerprint, :string
      add_index table, %i[organization_id idempotency_key], unique: true, where: "idempotency_key IS NOT NULL"
    end
  end
end
