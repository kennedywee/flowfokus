# Small record builders. Each spec states the data it depends on.
module Builders
  def demo_user
    User.find_or_create_by!(workos_id: Flowfokus::DemoIdentity::USER[:workos_id]) do |user|
      user.assign_attributes(Flowfokus::DemoIdentity::USER.except(:workos_id))
    end
  end

  def create_organization(slug:, workos_id: "org_#{slug}", published: true, currency: "MYR")
    Organization.create!(slug:, workos_id:, name: slug.titleize, published:, currency:, timezone: "Asia/Kuala_Lumpur")
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
end

RSpec.configure { |config| config.include Builders }
