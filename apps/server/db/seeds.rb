# Local demo data. Idempotent: run it as often as you like.
# Refuses to run in production. Production data comes from WorkOS sync and staff.
abort "db/seeds.rb is local demo data and does not run in production." if Rails.env.production?
# Specs build their own data. bin/rails db:prepare seeds new databases, so skip test.
return if Rails.env.test?

demo = Flowfokus::DemoIdentity

# Local staff identities. IDs and emails match workos-emulate.config.yaml at the
# repository root, so emulator sign-ins find these users. Fake data only.
LOCAL_STAFF = [
  demo::USER,
  { workos_id: "user_demo_chainsaw_receptionist", email: "receptionist@example.com", first_name: "Demo", last_name: "Receptionist" },
  { workos_id: "user_demo_ironworks_owner", email: "ironworks.owner@example.com", first_name: "Ironworks", last_name: "Owner" },
  { workos_id: "user_demo_multi_org", email: "manager@example.com", first_name: "Demo", last_name: "Manager" }
].freeze

ActiveRecord::Base.transaction do
  # Once WorkOS sync has written a user (workos:reconcile or a webhook), sync
  # owns its email and names. Seeds only create missing users and fill users
  # that sync has not touched.
  staff = LOCAL_STAFF.to_h do |attributes|
    user = User.find_or_initialize_by(workos_id: attributes[:workos_id])
    user.update!(attributes.except(:workos_id)) unless user.workos_updated_at || user.workos_deleted?
    [ attributes[:workos_id], user ]
  end
  owner = staff.fetch(demo::USER[:workos_id])

  # The synced copy of WorkOS memberships. WorkOS stays the authority, so seeds
  # only fill a gap before the first sync. They never change a copy that sync
  # wrote (for example an inactive one), never touch removed copies kept for
  # history, and never add a copy where sync removed one or for a deleted user
  # or gym. Only the live copy counts; tombstones may exist beside it.
  seed_membership = ->(organization, workos_id, role) do
    user = staff.fetch(workos_id)
    return if user.workos_deleted? || organization.workos_deleted?

    memberships = organization.organization_memberships.where(user:)
    membership = memberships.live.first
    return if membership&.synced_from_workos?
    return if membership.nil? && memberships.where.not(workos_deleted_at: nil).exists?

    (membership || memberships.new).update!(role:, status: "active")
  end

  seed_organization = lambda do |slug:, workos_id:, name:, published:, timezone: "Asia/Kuala_Lumpur", currency: "MYR"|
    # Flowfokus owns gym settings. After sync has written the gym, sync owns its name.
    Organization.find_or_initialize_by(slug:).tap do |organization|
      organization.name = name unless organization.workos_updated_at
      organization.update!(workos_id:, published:, timezone:, currency:)
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
  seed_membership.(chainsaw, owner.workos_id, "owner")
  seed_membership.(chainsaw, "user_demo_chainsaw_receptionist", "receptionist")
  seed_membership.(chainsaw, "user_demo_multi_org", "owner")
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
  seed_membership.(ironworks, "user_demo_ironworks_owner", "owner")
  seed_membership.(ironworks, "user_demo_multi_org", "receptionist")
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
