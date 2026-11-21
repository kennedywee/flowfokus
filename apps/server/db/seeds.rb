# Local seed data. Idempotent: run it as often as you like.
# Refuses to run in production. Production data comes from WorkOS sync and staff.
abort "db/seeds.rb is local seed data and does not run in production." if Rails.env.production?
# Specs build their own data. bin/rails db:prepare seeds new databases, so skip test.
return if Rails.env.test?

demo = Flowfokus::DemoIdentity

# Local staff identities. IDs and emails match workos-emulate.config.yaml at the
# repository root, so emulator sign-ins find these users. Fake data only.
# Kennedy (the fixed demo actor), Aiman, and Dana work at Chainsaw only. Rachel works at both gyms.
LOCAL_STAFF = [
  demo::USER,
  { workos_id: "user_rachel", email: "rachel@flowfokus.com", first_name: "Rachel", last_name: "Lim" },
  { workos_id: "user_aiman", email: "aiman@flowfokus.com", first_name: "Aiman", last_name: "Hakim" },
  # A Flowfokus developer. WorkOS gives the Developer role; gyms cannot.
  { workos_id: "user_dana", email: "dana@flowfokus.com", first_name: "Dana", last_name: "Chong" }
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
  seed_price = lambda do |product, label:, amount_minor:, duration_days: nil, archived: false|
    price = product.prices.find_by(label:) ||
      product.prices.create!(organization: product.organization, label:, amount_minor:,
        currency: product.organization.currency, duration_days:)
    price.archive! if archived && price.archived_at.nil?
    price
  end

  seed_product = lambda do |organization, name:, description:, published: true, position: 0, kind: "membership", benefits:|
    product = organization.products.find_or_initialize_by(name:)
    product.kind = kind if product.new_record?
    product.update!(description:, published:, position:)
    benefits.each do |benefit|
      product.benefits.find_or_initialize_by(name: benefit[:name]) { |record| record.organization = organization }
        .update!(kind: benefit.fetch(:kind, "gym_access"), usage_limit: benefit[:usage_limit], location: benefit[:location],
          program_kind: benefit[:program_kind], program_ids: benefit.fetch(:program_ids, []))
    end
    product
  end

  # Programs and their coming times. Times are relative to today, so a later
  # run adds the days that are now in range and skips times that exist.
  seed_program = lambda do |organization, name:, kind:, location:, capacity:, duration_minutes:, host_name: nil, description:|
    organization.programs.find_or_initialize_by(name:).tap do |program|
      program.kind = kind if program.new_record?
      program.update!(location:, capacity:, duration_minutes:, host_name:, description:, published: true)
    end
  end

  # The next date on or after today for a weekday (0 = Sunday), in the gym's zone.
  next_weekday = ->(organization, wday) { organization.time_zone.today.then { _1 + ((wday - _1.wday) % 7) } }

  seed_ticket = lambda do |program, label:, amount_minor:|
    next if program.ticket_product&.prices&.exists?(label:)

    program.add_ticket!(label:, amount_minor:)
  end

  # Chainsaw: the demo organization. The demo token maps to its owner.
  chainsaw = seed_organization.(slug: demo::ORGANIZATION_SLUG, workos_id: demo::ORGANIZATION_WORKOS_ID,
    name: "Chainsaw", published: true)
  seed_membership.(chainsaw, owner.workos_id, "owner")
  seed_membership.(chainsaw, "user_rachel", "manager")
  seed_membership.(chainsaw, "user_aiman", "receptionist")
  seed_membership.(chainsaw, "user_dana", "developer")
  # Chainsaw has its gym site, so the site checks and smoke runs work.
  chainsaw.change_feature!("gym_site", state: "on")
  bangsar = seed_location.(chainsaw, "Bangsar", "12 Jalan Telawi, Bangsar, Kuala Lumpur")
  seed_location.(chainsaw, "Mont Kiara", "3 Jalan Kiara, Mont Kiara, Kuala Lumpur")

  unlimited = seed_product.(chainsaw, name: "Monthly Unlimited", position: 1,
    description: "Unlimited gym access and group classes at every Chainsaw location for 30 days.",
    benefits: [ { name: "Gym access", usage_limit: nil, location: nil },
                { kind: "program_access", name: "Group classes", usage_limit: nil, program_kind: "group_class" } ])
  seed_price.(unlimited, label: "Monthly (2025 rate)", amount_minor: 10_000, duration_days: 30, archived: true)
  seed_price.(unlimited, label: "Monthly", amount_minor: 12_000, duration_days: 30)

  visits = seed_product.(chainsaw, name: "Monthly 8 Visits", position: 2,
    description: "Eight gym visits at any Chainsaw location within 30 days.",
    benefits: [ { name: "8 gym visits", usage_limit: 8, location: nil } ])
  seed_price.(visits, label: "Monthly", amount_minor: 8_000, duration_days: 30)

  trial = seed_product.(chainsaw, name: "Staff Trial", position: 9, published: false,
    description: "Complimentary trial issued by staff. Not shown on the gym site.",
    benefits: [ { name: "Trial visits", usage_limit: 3, location: nil } ])
  seed_price.(trial, label: "Trial", amount_minor: 0, duration_days: 7)

  # Programs at Bangsar: two weekly classes, a one-day event, and appointment slots.
  yoga = seed_program.(chainsaw, name: "Yoga Flow", kind: "group_class", location: bangsar, capacity: 12,
    duration_minutes: 60, host_name: "Aina", description: "A steady vinyasa class for every level. Mats provided.")
  hiit = seed_program.(chainsaw, name: "HIIT Express", kind: "group_class", location: bangsar, capacity: 16,
    duration_minutes: 45, host_name: "Farid", description: "Short, hard intervals. Bring water and a towel.")
  seminar = seed_program.(chainsaw, name: "Deadlift Seminar", kind: "event", location: bangsar, capacity: 30,
    duration_minutes: 180, host_name: "Ravi", description: "Technique, bracing, and programming for the deadlift.")
  coaching = seed_program.(chainsaw, name: "PT with Aina", kind: "appointment", location: bangsar, capacity: 1,
    duration_minutes: 60, host_name: "Aina", description: "One-to-one personal training.")

  [ [ yoga, 2, "19:00" ], [ yoga, 4, "19:00" ], [ hiit, 1, "07:00" ], [ hiit, 3, "07:00" ] ].each do |program, wday, time|
    program.schedule!(date: next_weekday.(chainsaw, wday).iso8601, time:, weeks: 4)
  end
  seminar.schedule!(date: next_weekday.(chainsaw, 6).+(7).iso8601, time: "10:00") if seminar.occurrences.upcoming.none?
  %w[09:00 10:00 11:00].each { coaching.schedule!(date: next_weekday.(chainsaw, 5).iso8601, time: _1, weeks: 2) }

  seed_ticket.(yoga, label: "Drop-in", amount_minor: 2_500)
  seed_ticket.(hiit, label: "Drop-in", amount_minor: 2_000)
  seed_ticket.(seminar, label: "Early bird", amount_minor: 8_000)
  seed_ticket.(seminar, label: "Standard", amount_minor: 12_000)
  seed_ticket.(coaching, label: "Single session", amount_minor: 15_000)

  class_pass = seed_product.(chainsaw, name: "10-Class Pass", kind: "pass", position: 3,
    description: "Ten group classes at Chainsaw within 60 days.",
    benefits: [ { kind: "program_access", name: "10 group classes", usage_limit: 10, program_kind: "group_class" } ])
  seed_price.(class_pass, label: "10 classes", amount_minor: 20_000, duration_days: 60)

  seed_member.(chainsaw, "Aisyah Rahman", "aisyah@example.com")
  seed_member.(chainsaw, "Ben Tan", "ben@example.com")
  seed_member.(chainsaw, "Chloe Lim", "chloe@example.com")
  # Not linked to a sign-in. Staff give Patrick a link code; he signs in on the
  # gym site as patrick@example.com and enters it.
  seed_member.(chainsaw, "Patrick Ng", "patrick@example.com")

  # Irongate: a second gym for isolation and organization switching. The demo token has no access.
  irongate = seed_organization.(slug: "irongate", workos_id: "org_irongate", name: "Irongate", published: true)
  seed_location.(irongate, "George Town", "88 Lebuh Pantai, George Town, Penang")
  seed_membership.(irongate, "user_rachel", "owner")
  iron_monthly = seed_product.(irongate, name: "Monthly Unlimited", position: 1,
    description: "Unlimited gym access for 30 days.",
    benefits: [ { name: "Gym access", usage_limit: nil, location: nil } ])
  seed_price.(iron_monthly, label: "Monthly", amount_minor: 9_900, duration_days: 30)
  iron_visits = seed_product.(irongate, name: "10 Visits", position: 2,
    description: "Ten gym visits within 60 days.",
    benefits: [ { name: "10 gym visits", usage_limit: 10, location: nil } ])
  seed_price.(iron_visits, label: "10 visits", amount_minor: 15_000, duration_days: 60)
  seed_member.(irongate, "Dinesh Kumar", "dinesh@example.com")
  seed_member.(irongate, "Sofia Wong", "sofia@example.com")
end

puts "Seeded: #{Organization.count} organizations, #{Location.count} locations, #{Member.count} members, " \
     "#{Product.count} products, #{Price.count} prices, #{Program.count} programs, #{Occurrence.count} times."
