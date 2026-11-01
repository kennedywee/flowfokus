# A one-time code that staff give a member, so the member can link their
# sign-in to their member record. Only a digest of the code is stored.
class CreateMemberLinkCodes < ActiveRecord::Migration[8.1]
  def change
    create_table :member_link_codes, id: :uuid do |t|
      t.references :organization, type: :uuid, null: false, foreign_key: true, index: false
      t.uuid :member_id, null: false
      t.references :created_by_user, type: :uuid, null: false, foreign_key: { to_table: :users }
      t.string :code_digest, null: false
      t.datetime :expires_at, null: false
      t.datetime :used_at
      t.references :used_by_user, type: :uuid, foreign_key: { to_table: :users }
      t.timestamps

      t.index :code_digest, unique: true
      t.index %i[organization_id member_id]
      t.check_constraint "(used_at IS NULL) = (used_by_user_id IS NULL)", name: "member_link_codes_use_shape"
    end
    add_foreign_key :member_link_codes, :members, column: %i[member_id organization_id], primary_key: %i[id organization_id]
  end
end
