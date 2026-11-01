# A renewal sale copies the agreed terms of an earlier line item. The link keeps
# that trace. The composite key keeps it inside the same organization.
class AddRenewalSourceToSales < ActiveRecord::Migration[8.1]
  def change
    add_column :sales, :renews_line_item_id, :uuid
    add_index :sales, :renews_line_item_id
    add_foreign_key :sales, :sale_line_items, column: [ :renews_line_item_id, :organization_id ], primary_key: [ :id, :organization_id ]
  end
end
