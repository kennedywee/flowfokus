class CreateIdentity < ActiveRecord::Migration[8.1]
  def change
    enable_extension "btree_gist"

    create_table :users, id: :uuid do |t|
      t.string :workos_id, null: false, index: { unique: true }
      t.string :email, null: false
      t.string :first_name
      t.string :last_name
      t.timestamps
    end

    create_table :organizations, id: :uuid do |t|
      t.string :workos_id, index: { unique: true }
      t.string :name, null: false
      t.string :slug, null: false, index: { unique: true }
      t.string :timezone, null: false, default: "UTC"
      t.string :currency, null: false, limit: 3
      t.boolean :published, null: false, default: false
      t.timestamps
      t.check_constraint "slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'", name: "organizations_slug_format"
      t.check_constraint "currency ~ '^[A-Z]{3}$'", name: "organizations_currency_format"
    end

    # Synced copy of WorkOS staff memberships. Never used to authorize a request.
    create_table :organization_memberships, id: :uuid do |t|
      t.references :organization, type: :uuid, null: false, foreign_key: true, index: false
      t.references :user, type: :uuid, null: false, foreign_key: true
      t.string :workos_id, index: { unique: true }
      t.string :role, null: false
      t.string :status, null: false, default: "active"
      t.timestamps
      t.index [ :organization_id, :user_id ], unique: true
    end

    create_table :locations, id: :uuid do |t|
      t.references :organization, type: :uuid, null: false, foreign_key: true, index: false
      t.string :name, null: false
      t.string :address
      t.timestamps
      t.index [ :organization_id, :name ], unique: true
      t.index [ :id, :organization_id ], unique: true
    end

    create_table :members, id: :uuid do |t|
      t.references :organization, type: :uuid, null: false, foreign_key: true, index: false
      t.references :user, type: :uuid, foreign_key: true
      t.string :name, null: false
      t.string :email, null: false
      t.timestamps
      t.index "organization_id, lower(email)", unique: true, name: "index_members_on_organization_id_and_lower_email"
      t.index [ :organization_id, :created_at ]
      t.index [ :id, :organization_id ], unique: true
      t.index [ :organization_id, :user_id ], unique: true, where: "user_id IS NOT NULL"
    end
  end
end
