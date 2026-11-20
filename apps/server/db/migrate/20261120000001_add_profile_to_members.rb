# What staff record about a member beyond the name and email. All optional.
# The note is for staff only; the member area never returns it.
class AddProfileToMembers < ActiveRecord::Migration[8.1]
  def change
    add_column :members, :phone, :string
    add_column :members, :date_of_birth, :date
    add_column :members, :emergency_contact_name, :string
    add_column :members, :emergency_contact_phone, :string
    add_column :members, :note, :text
  end
end
