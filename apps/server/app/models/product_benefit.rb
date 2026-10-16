# A promised benefit. A catalog template, not a usable right.
class ProductBenefit < ApplicationRecord
  include TenantOwned

  belongs_to :product
  belongs_to :location, optional: true
  same_organization_as :product, :location

  validates :name, presence: true
  validates :kind, inclusion: { in: %w[gym_access] }
  validates :usage_limit, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true

  # Copied into each sale line. Later catalog edits never change a sale.
  def terms = { kind:, name:, usage_limit:, location_id: }

  def as_api = { id:, kind:, name:, usage_limit:, location_id: }

  def as_public_api(location_names)
    { kind:, name:, usage_limit:, location_name: location_id && location_names[location_id] }
  end
end
