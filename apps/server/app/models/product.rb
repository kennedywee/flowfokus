# An offer. In the first release every product is a membership.
class Product < ApplicationRecord
  include TenantOwned

  has_many :benefits, -> { order(:created_at) }, class_name: "ProductBenefit", autosave: true, dependent: :restrict_with_exception
  has_many :prices, -> { order(:amount_minor, :created_at) }, dependent: :restrict_with_exception

  MAX_BENEFITS = 10

  validates :name, presence: true, length: { maximum: 200 }
  validates :description, length: { maximum: 2_000 }
  validates :kind, inclusion: { in: %w[membership] }
  validate :benefits_present, if: -> { @benefits_replaced }

  before_create { self.position = (organization.products.maximum(:position) || -1) + 1 }

  scope :published, -> { where(published: true) }

  # Replaces the benefit templates. Past sales keep their snapshotted terms.
  def replace_benefits(list)
    @benefits_replaced = true
    benefits.each(&:mark_for_destruction)
    Array(list).first(MAX_BENEFITS + 1).each do |attributes|
      attributes = attributes.to_h.symbolize_keys
      benefits.build(organization:, kind: "gym_access", name: attributes[:name],
        usage_limit: attributes[:usage_limit].presence, location_id: attributes[:location_id].presence)
    end
  end

  def add_price!(label:, amount_minor:, duration_days:)
    prices.create!(organization:, label:, amount_minor:, duration_days:, currency: organization.currency)
  end

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

  private
    def benefits_present
      kept = benefits.reject(&:marked_for_destruction?)
      errors.add(:benefits, "must include at least one benefit") if kept.empty?
      errors.add(:benefits, "can include at most #{MAX_BENEFITS} benefits") if kept.size > MAX_BENEFITS
    end
end
