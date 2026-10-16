class Location < ApplicationRecord
  include TenantOwned

  validates :name, presence: true, uniqueness: { scope: :organization_id }

  def as_api = { id:, name:, address: }
end
