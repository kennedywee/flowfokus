# A staff override lets a member in after a denial. It records why, keeps the
# denial reason, and consumes no entitlement.
class AddOverrideToCheckIns < ActiveRecord::Migration[8.1]
  def change
    add_column :check_ins, :override_reason, :text
    remove_check_constraint :check_ins,
      "result::text = 'granted'::text AND denial_reason IS NULL AND entitlement_id IS NOT NULL OR result::text = 'denied'::text AND denial_reason IS NOT NULL AND entitlement_id IS NULL",
      name: "check_ins_result_shape"
    add_check_constraint :check_ins,
      "(result = 'granted' AND denial_reason IS NULL AND entitlement_id IS NOT NULL AND override_reason IS NULL) OR " \
      "(result = 'denied' AND denial_reason IS NOT NULL AND entitlement_id IS NULL AND override_reason IS NULL) OR " \
      "(result = 'granted' AND denial_reason IS NOT NULL AND entitlement_id IS NULL AND override_reason IS NOT NULL AND length(btrim(override_reason)) > 0)",
      name: "check_ins_result_shape"
  end
end
