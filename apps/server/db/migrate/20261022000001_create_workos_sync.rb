# WorkOS identity sync: an accepted-event ledger, remote version watermarks,
# and tombstones that keep history while blocking stale events.
class CreateWorkosSync < ActiveRecord::Migration[8.1]
  def change
    create_table :workos_events, id: :uuid do |t|
      t.string :workos_id, null: false
      t.string :event_type, null: false
      t.string :subject_id
      t.string :organization_workos_id
      t.datetime :occurred_at, null: false
      t.jsonb :payload, null: false
      t.string :status, null: false, default: "pending"
      t.string :outcome
      t.integer :attempts, null: false, default: 0
      t.text :last_error
      t.datetime :processed_at
      t.timestamps
      t.index :workos_id, unique: true
      t.index [ :status, :created_at ]
      t.index [ :subject_id, :event_type ]
      t.index [ :organization_workos_id, :event_type ]
      t.check_constraint "status IN ('pending', 'processed', 'ignored', 'failed')", name: "workos_events_status"
      t.check_constraint "attempts >= 0", name: "workos_events_attempts_non_negative"
      t.check_constraint "jsonb_typeof(payload) = 'object'", name: "workos_events_payload_object"
    end

    create_function :prevent_workos_event_changes
    create_trigger :workos_events_immutable, on: :workos_events

    change_table :users, bulk: true do |t|
      t.datetime :workos_updated_at
      t.datetime :workos_deleted_at
    end

    change_table :organizations, bulk: true do |t|
      t.datetime :workos_updated_at
      t.datetime :workos_deleted_at
      t.datetime :workos_synced_at
    end

    change_table :organization_memberships, bulk: true do |t|
      t.datetime :workos_updated_at
      t.datetime :workos_deleted_at
      t.datetime :synced_at
    end
    add_check_constraint :organization_memberships, "status IN ('active', 'inactive', 'pending')",
      name: "organization_memberships_status"

    # A removed membership stays as a tombstone. Only one live copy per user and organization.
    remove_index :organization_memberships, [ :organization_id, :user_id ], unique: true
    add_index :organization_memberships, [ :organization_id, :user_id ], unique: true,
      where: "workos_deleted_at IS NULL", name: "index_organization_memberships_live"
    add_index :organization_memberships, [ :organization_id, :user_id ], name: "index_organization_memberships_on_organization_id_and_user_id"
  end
end
