# Something people attend: a group class, an event, or an appointment.
# Each dated instance is an Occurrence. Tickets made from a program are
# products of kind "ticket" that keep the program.
class Program < ApplicationRecord
  include TenantOwned
  include Idempotent

  KINDS = %w[group_class event appointment].freeze
  MAX_WEEKS = 26

  class InvalidSchedule < StandardError; end

  belongs_to :location
  has_many :occurrences, -> { order(:starts_at) }, dependent: :restrict_with_exception
  has_many :ticket_products, -> { where(kind: "ticket") }, class_name: "Product", dependent: :restrict_with_exception
  same_organization_as :location

  normalizes :name, with: ->(name) { name.squish }
  normalizes :host_name, with: ->(name) { name.squish.presence }

  validates :name, presence: true, length: { maximum: 200 }
  validates :description, length: { maximum: 2_000 }
  validates :host_name, length: { maximum: 200 }
  validates :kind, inclusion: { in: KINDS }
  validates :capacity, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: 10_000 }
  validates :duration_minutes, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: 1_440 }
  validate { errors.add(:location_id, "was not found") if location_id.present? && location.nil? }

  scope :published, -> { where(published: true) }
  scope :by_name, -> { order(:name, :id) }

  # The one ticket product for this program, made the first time staff add a ticket price.
  def ticket_product = ticket_products.first

  # Adds a program. A retry with the same key returns the first program.
  # Returns [program, created].
  def self.add!(organization:, idempotency_key:, attributes:)
    attributes = attributes.to_h.symbolize_keys
    fingerprint = Idempotent.fingerprint(**attributes)
    with_idempotency(organization.programs, key: idempotency_key, fingerprint:) do
      organization.programs.create!(**attributes, idempotency_key:, request_fingerprint: fingerprint)
    end
  end

  # Adds a ticket price. Creates the ticket product on first use. A retry with
  # the same key returns the first price. Returns [price, created].
  def add_ticket!(label:, amount_minor:, idempotency_key: nil)
    fingerprint = Idempotent.fingerprint(program_id: id, label:, amount_minor:)
    if idempotency_key && (existing = Price.replay(organization.prices, key: idempotency_key, fingerprint:))
      return [ existing, false ]
    end

    transaction do
      lock!
      product = ticket_product || organization.products.create!(
        kind: "ticket", program: self, name: "#{name} ticket", published: true,
        description: "Entry to one #{kind.humanize(capitalize: false)} of #{name}."
      ).tap do |created|
        created.benefits.create!(organization:, kind: "program_access", name: "Entry to #{name}",
          usage_limit: 1, location_id:, program_ids: [ id ])
      end
      price = product.prices.create!(organization:, label:, amount_minor:, currency: organization.currency, duration_days: nil,
        idempotency_key:, request_fingerprint: (fingerprint if idempotency_key))
      [ price, true ]
    end
  rescue ActiveRecord::RecordNotUnique => error
    raise unless idempotency_key && error.message.include?("idempotency_key")

    [ Price.replay(organization.prices, key: idempotency_key, fingerprint:) || raise, false ]
  end

  # Adds occurrences at a local date and time, repeating weekly. Skips times
  # that already exist. Returns the new occurrences.
  def schedule!(date:, time:, weeks: 1)
    weeks = Integer(weeks, exception: false)
    raise InvalidSchedule, "weeks must be between 1 and #{MAX_WEEKS}" unless weeks&.between?(1, MAX_WEEKS)

    day = Date.iso8601(date.to_s)
    hour, minute = parse_time(time)
    zone = organization.time_zone

    transaction do
      (0...weeks).filter_map do |week|
        starts_at = zone.local(*(day + (week * 7)).then { [ _1.year, _1.month, _1.day ] }, hour, minute)
        next if occurrences.exists?(starts_at:)

        occurrences.create!(organization:, starts_at:, ends_at: starts_at + duration_minutes.minutes, capacity:)
      end
    end
  rescue Date::Error
    raise InvalidSchedule, "date must be YYYY-MM-DD"
  end

  # Passes and memberships whose program rights cover this program here.
  def accepted_products(products = organization.products.offers.includes(:benefits))
    products.select do |product|
      product.benefits.any? do |benefit|
        benefit.kind == "program_access" && benefit.program_scope.covers?(self) &&
          (benefit.location_id.nil? || benefit.location_id == location_id)
      end
    end
  end

  # The ticket prices on sale now.
  def ticket_prices = ticket_product&.prices&.select(&:sellable?) || []

  # Staff view: times from today on, tickets, and the offers that cover it.
  def as_detail_api(at: Time.current)
    upcoming = occurrences.where("ends_at > ?", at.in_time_zone(organization.time_zone).beginning_of_day).limit(200).to_a
    taken = Occurrence.taken_counts(upcoming.map(&:id), at)
    as_api.merge(
      location_name: location.name,
      occurrences: upcoming.map { _1.as_api(at:, taken: taken.fetch(_1.id, 0)) },
      ticket: ticket_product&.then { |product| { product_id: product.id, prices: product.prices.map(&:as_api) } },
      accepted_by: accepted_products.map { { id: _1.id, name: _1.name, kind: _1.kind } }
    )
  end

  def as_summary_api = { id:, name:, kind:, location_id:, host_name:, published: }

  def as_api
    {
      id:, name:, description:, kind:, location_id:, capacity:, duration_minutes:, host_name:, published:,
      created_at: api_time(created_at)
    }
  end

  def as_public_api(location_names)
    { id:, name:, description:, kind:, location_name: location_names[location_id], duration_minutes:, host_name: }
  end

  private
    def parse_time(value)
      match = /\A([01]\d|2[0-3]):([0-5]\d)\z/.match(value.to_s)
      raise InvalidSchedule, "time must be HH:MM" unless match

      [ match[1].to_i, match[2].to_i ]
    end
end
