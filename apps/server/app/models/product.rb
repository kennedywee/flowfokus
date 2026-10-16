# An offer. In the first release every product is a membership.
class Product < ApplicationRecord
  include TenantOwned

  has_many :benefits, -> { order(:created_at) }, class_name: "ProductBenefit", dependent: :restrict_with_exception
  has_many :prices, -> { order(:amount_minor, :created_at) }, dependent: :restrict_with_exception

  validates :name, presence: true
  validates :kind, inclusion: { in: %w[membership] }

  scope :published, -> { where(published: true) }

  def as_public_api(location_names)
    {
      id:, name:, description:,
      benefits: benefits.map { |benefit| benefit.as_public_api(location_names) },
      prices: prices.select(&:sellable?).map(&:as_public_api)
    }
  end

  def as_staff_api
    {
      id:, name:, description:, published:,
      benefits: benefits.map(&:as_api),
      prices: prices.map(&:as_api)
    }
  end
end
