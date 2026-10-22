# The ledger's organization_workos_id routes membership deletions, which block
# stale token observation. Make it immutable like the other received fields.
#
# Fx's update_function drops the function first, which the trigger depends on.
# The definitions use CREATE OR REPLACE, so apply them in place.
class ProtectWorkosEventOrganization < ActiveRecord::Migration[8.1]
  def up = execute(definition(2))
  def down = execute(definition(1))

  private
    def definition(version)
      Rails.root.join("db/functions/prevent_workos_event_changes_v#{format('%02d', version)}.sql").read
    end
end
