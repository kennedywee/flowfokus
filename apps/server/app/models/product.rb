# An offer: a membership, a pass, or a ticket. A ticket is made from a program
# page and keeps its program; its one benefit is entry to that program.
class Product < ApplicationRecord
  include TenantOwned

  KINDS = %w[membership pass ticket].freeze

  belongs_to :program, optional: true
  same_organization_as :program
  attr_readonly :kind, :program_id

  has_many :benefits, -> { order(:created_at) }, class_name: "ProductBenefit", autosave: true, dependent: :restrict_with_exception
  has_many :prices, -> { order(:amount_minor, :created_at) }, dependent: :restrict_with_exception

  MAX_BENEFITS = 10

  validates :name, presence: true, length: { maximum: 200 }
  validates :description, length: { maximum: 2_000 }
  validates :kind, inclusion: { in: KINDS }
  validate { errors.add(:program_id, "is required for a ticket and only for a ticket") if ticket? != program_id.present? }
  validate :benefits_present, if: -> { @benefits_replaced }

  before_create { self.position = (organization.products.maximum(:position) || -1) + 1 }

  scope :published, -> { where(published: true) }
  scope :offers, -> { where.not(kind: "ticket") }

  def ticket? = kind == "ticket"
  def membership? = kind == "membership"

  # Replaces the benefit templates. Past sales keep their snapshotted terms.
  def replace_benefits(list)
    @benefits_replaced = true
    benefits.each(&:mark_for_destruction)
    Array(list).first(MAX_BENEFITS + 1).each do |attributes|
      attributes = attributes.to_h.symbolize_keys
      kind = attributes[:kind].presence || "gym_access"
      benefits.build(organization:, kind:, name: attributes[:name],
        usage_limit: attributes[:usage_limit].presence, location_id: attributes[:location_id].presence,
        program_ids: kind == "program_access" ? Array(attributes[:program_ids]).compact_blank.uniq : [],
        program_kind: (attributes[:program_kind].presence if kind == "program_access"))
    end
  end

  def add_price!(label:, amount_minor:, duration_days:)
    prices.create!(organization:, label:, amount_minor:, duration_days: (duration_days unless ticket?), currency: organization.currency)
  end

  def as_public_api(location_names, program_names = {})
    {
      id:, name:, description:, kind:,
      benefits: benefits.map { |benefit| benefit.as_public_api(location_names, program_names) },
      prices: prices.select(&:sellable?).map(&:as_public_api)
    }
  end

  def as_staff_api
    {
      id:, name:, description:, published:, kind:, program_id:,
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
