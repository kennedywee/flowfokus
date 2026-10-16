# Local demo data. Idempotent: run it as often as you like.
# Refuses to run in production. Production data comes from WorkOS sync and staff.
abort "db/seeds.rb is local demo data and does not run in production." if Rails.env.production?

demo = Hydraflow::DemoIdentity

ActiveRecord::Base.transaction do
  owner = User.find_or_initialize_by(workos_id: demo::USER[:workos_id])
  owner.update!(demo::USER.except(:workos_id))

  seed_organization = lambda do |slug:, workos_id:, name:, published:, timezone: "Asia/Kuala_Lumpur", currency: "MYR"|
    Organization.find_or_initialize_by(slug:).tap do |organization|
      organization.update!(workos_id:, name:, published:, timezone:, currency:)
    end
  end

  seed_location = ->(organization, name, address) do
    organization.locations.find_or_initialize_by(name:).tap { |location| location.update!(address:) }
  end

  seed_member = ->(organization, name, email) do
    organization.members.find_or_create_by!(email:) { |member| member.name = name }
  end

  # Prices are immutable. Find by product and label; create once.
  seed_price = lambda do |product, label:, amount_minor:, duration_days:, archived: false|
    price = product.prices.find_by(label:) ||
      product.prices.create!(organization: product.organization, label:, amount_minor:,
        currency: product.organization.currency, duration_days:)
    price.archive! if archived && price.archived_at.nil?
    price
  end

  seed_product = lambda do |organization, name:, description:, published: true, position: 0, benefits:|
    product = organization.products.find_or_initialize_by(name:)
    product.update!(description:, published:, position:, kind: "membership")
    benefits.each do |benefit|
      product.benefits.find_or_initialize_by(name: benefit[:name]) { |record| record.organization = organization }
        .update!(kind: "gym_access", usage_limit: benefit[:usage_limit], location: benefit[:location])
    end
    product
  end

  # Chainsaw: the demo organization. The demo token maps to its owner.
  chainsaw = seed_organization.(slug: demo::ORGANIZATION_SLUG, workos_id: demo::ORGANIZATION_WORKOS_ID,
    name: "Chainsaw Gym", published: true)
  chainsaw.organization_memberships.find_or_initialize_by(user: owner).update!(role: "owner", status: "active")
  bangsar = seed_location.(chainsaw, "Bangsar", "12 Jalan Telawi, Bangsar, Kuala Lumpur")
  seed_location.(chainsaw, "Mont Kiara", "3 Jalan Kiara, Mont Kiara, Kuala Lumpur")

  unlimited = seed_product.(chainsaw, name: "Monthly Unlimited", position: 1,
    description: "Unlimited gym access at every Chainsaw location for 30 days.",
    benefits: [ { name: "Gym access", usage_limit: nil, location: nil } ])
  seed_price.(unlimited, label: "Monthly (2025 rate)", amount_minor: 10_000, duration_days: 30, archived: true)
  seed_price.(unlimited, label: "Monthly", amount_minor: 12_000, duration_days: 30)

  visits = seed_product.(chainsaw, name: "Monthly 8 Visits", position: 2,
    description: "Eight gym visits at any Chainsaw location within 30 days.",
    benefits: [ { name: "8 gym visits", usage_limit: 8, location: nil } ])
  seed_price.(visits, label: "Monthly", amount_minor: 8_000, duration_days: 30)

  weekly = seed_product.(chainsaw, name: "Bangsar Weekly", position: 3,
    description: "Unlimited access at Bangsar for 7 days.",
    benefits: [ { name: "Bangsar gym access", usage_limit: nil, location: bangsar } ])
  seed_price.(weekly, label: "Weekly", amount_minor: 3_500, duration_days: 7)

  trial = seed_product.(chainsaw, name: "Staff Trial", position: 9, published: false,
    description: "Complimentary trial issued by staff. Not shown on the gym site.",
    benefits: [ { name: "Trial visits", usage_limit: 3, location: nil } ])
  seed_price.(trial, label: "Trial", amount_minor: 0, duration_days: 7)

  seed_member.(chainsaw, "Aisyah Rahman", "aisyah@example.com")
  seed_member.(chainsaw, "Ben Tan", "ben@example.com")
  seed_member.(chainsaw, "Chloe Lim", "chloe@example.com")

  # Ironworks: a second tenant for isolation checks. The demo token has no access.
  ironworks = seed_organization.(slug: "ironworks", workos_id: "org_demo_ironworks",
    name: "Ironworks Fitness", published: true)
  seed_location.(ironworks, "Penang", "88 Lebuh Pantai, George Town, Penang")
  iron_monthly = seed_product.(ironworks, name: "Ironworks Monthly", position: 1,
    description: "Unlimited access for 30 days.",
    benefits: [ { name: "Gym access", usage_limit: nil, location: nil } ])
  seed_price.(iron_monthly, label: "Monthly", amount_minor: 9_900, duration_days: 30)
  iron_ten = seed_product.(ironworks, name: "Ironworks 10 Visits", position: 2,
    description: "Ten visits within 60 days.",
    benefits: [ { name: "10 gym visits", usage_limit: 10, location: nil } ])
  seed_price.(iron_ten, label: "10 visits", amount_minor: 15_000, duration_days: 60)
  seed_member.(ironworks, "Dinesh Kumar", "dinesh@example.com")
  seed_member.(ironworks, "Aisyah Rahman", "aisyah@example.com")

  # Unpublished tenant: public endpoints must return 404.
  hidden = seed_organization.(slug: "hidden", workos_id: "org_demo_hidden", name: "Hidden Gym", published: false)
  seed_location.(hidden, "Main", nil)
end

puts "Seeded: #{Organization.count} organizations, #{Location.count} locations, #{Member.count} members, " \
     "#{Product.count} products, #{Price.count} prices."
