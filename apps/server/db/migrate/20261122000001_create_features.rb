# The state of each feature flag per organization. The list of features lives
# in Feature::LIST. An organization with no row for a feature has it Off.
class CreateFeatures < ActiveRecord::Migration[8.1]
  def change
    create_table :features, id: :uuid do |t|
      t.references :organization, type: :uuid, null: false, foreign_key: true, index: false
      t.string :key, null: false
      t.string :state, null: false, default: "off"
      # The organization turned on a feature in Labs. Only a Labs feature can be turned on.
      t.boolean :enabled, null: false, default: false
      t.timestamps

      t.index %i[organization_id key], unique: true
      t.check_constraint "key ~ '^[a-z][a-z0-9_]{0,62}$'", name: "features_key_format"
      t.check_constraint "state IN ('off', 'labs', 'on')", name: "features_state"
      t.check_constraint "state = 'labs' OR NOT enabled", name: "features_enabled_only_in_labs"
    end

    # Every live gym site keeps its site: published organizations start with it On.
    up_only do
      execute <<~SQL
        INSERT INTO features (organization_id, key, state, enabled, created_at, updated_at)
        SELECT id, 'gym_site', 'on', false, now(), now() FROM organizations WHERE published
      SQL
    end
  end
end
