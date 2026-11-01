class Location < ApplicationRecord
  include TenantOwned

  normalizes :name, with: ->(name) { name.squish }
  normalizes :address, with: ->(address) { address.strip.presence }

  validates :name, presence: true, length: { maximum: 100 }, uniqueness: { scope: :organization_id }
  validates :address, length: { maximum: 300 }

  def as_api = { id:, name:, address: }
end
