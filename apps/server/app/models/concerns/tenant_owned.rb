# A record that belongs to one organization. Linked records must belong to the
# same organization. Composite foreign keys enforce this in the database too.
module TenantOwned
  extend ActiveSupport::Concern

  included do
    belongs_to :organization
    attr_readonly :organization_id
  end

  class_methods do
    def same_organization_as(*associations)
      validate do
        associations.each do |name|
          linked = public_send(name)
          next if linked.nil? || linked.organization_id == organization_id

          errors.add(:"#{name}_id", "was not found")
        end
      end
    end
  end
end
