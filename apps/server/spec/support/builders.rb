# Small record builders. Each spec states the data it depends on.
module Builders
  def demo_user
    User.find_or_create_by!(workos_id: Flowfokus::DemoIdentity::USER[:workos_id]) do |user|
      user.assign_attributes(Flowfokus::DemoIdentity::USER.except(:workos_id))
    end
  end

  # A published organization gets the gym site feature On, as the migration
  # gave every published organization.
  def create_organization(slug:, workos_id: "org_#{slug}", published: true, currency: "MYR")
    Organization.create!(slug:, workos_id:, name: slug.titleize, published:, currency:, timezone: "Asia/Kuala_Lumpur").tap do |organization|
      organization.change_feature!("gym_site", state: "on") if published
    end
  end

  def chainsaw
    @chainsaw ||= Organization.find_by(slug: "chainsaw") ||
      create_organization(slug: "chainsaw", workos_id: Flowfokus::DemoIdentity::ORGANIZATION_WORKOS_ID)
  end

  def ironworks
    @ironworks ||= Organization.find_by(slug: "ironworks") || create_organization(slug: "ironworks")
  end

  def create_location(organization, name: "Main #{SecureRandom.hex(3)}")
    organization.locations.create!(name:, address: "1 Test Street")
  end

  def create_member(organization, name: "Member #{SecureRandom.hex(3)}", email: "#{SecureRandom.hex(4)}@example.test")
    organization.members.create!(name:, email:)
  end

  # A published membership product with one benefit and one available price.
  def create_offer(organization, amount_minor: 12_000, duration_days: 30, usage_limit: nil, location: nil, published: true, name: "Offer #{SecureRandom.hex(3)}")
    product = organization.products.create!(name:, description: "Test offer", published:)
    product.benefits.create!(organization:, kind: "gym_access", name: "Gym access", usage_limit:, location:)
    product.prices.create!(organization:, label: "Standard", amount_minor:, currency: organization.currency, duration_days:)
  end

  def record_sale(organization, member:, price:, location:, at: Time.current, key: SecureRandom.uuid)
    Sale.record!(organization:, actor: demo_user, idempotency_key: key, member_id: member.id,
      price_id: price.id, location_id: location.id, at:).first
  end

  def pay_in_full(sale)
    return sale if sale.paid_in_full?

    sale.record_payment!(actor: demo_user, idempotency_key: SecureRandom.uuid, amount_minor: sale.balance_minor, method: "cash")
    sale.reload
  end

  # Sells, pays, and fulfills. Returns the fulfilled sale.
  def grant_access(organization, member:, location:, at: Time.current, **offer)
    price = create_offer(organization, location: offer.delete(:benefit_location), **offer)
    sale = pay_in_full(record_sale(organization, member:, price:, location:, at:))
    sale.fulfill!(actor: demo_user, at:)
    sale.reload
  end

  # A program with weekly times. Times start two days ahead at 19:00 gym time.
  def create_program(organization, location:, kind: "group_class", capacity: 10, published: true,
    name: "Program #{SecureRandom.hex(3)}", weeks: 1, first_day: Date.current + 2)
    program = organization.programs.create!(name:, kind:, location:, capacity:, duration_minutes: 60, published:)
    program.schedule!(date: first_day.iso8601, time: "19:00", weeks:)
    program
  end

  # A pass with one program_access benefit. Returns its price.
  def create_pass(organization, usage_limit: 10, duration_days: 30, program_kind: nil, program_ids: [],
    published: true, amount_minor: 20_000, name: "Pass #{SecureRandom.hex(3)}")
    product = organization.products.create!(name:, kind: "pass", published:)
    product.benefits.create!(organization:, kind: "program_access", name: "Classes", usage_limit:, program_kind:, program_ids:)
    product.prices.create!(organization:, label: "Standard", amount_minor:, currency: organization.currency, duration_days:)
  end

  # Sells a price, pays it, and delivers it. Returns the sale.
  def deliver(organization, member:, price:, location:, occurrence: nil, at: Time.current)
    sale = Sale.record!(organization:, actor: demo_user, idempotency_key: SecureRandom.uuid, member_id: member.id,
      price_id: price.id, location_id: location.id, occurrence_id: occurrence&.id, at:).first
    pay_in_full(sale).fulfill!(actor: demo_user, at:)
    sale.reload
  end
end

RSpec.configure { |config| config.include Builders }
