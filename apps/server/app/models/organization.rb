class Organization < ApplicationRecord
  include WorkosSynced

  RESERVED_SLUGS = %w[
    admin api app auth billing blog dashboard docs help login logout mail portal
    signin signout signup sso static status support www
  ].freeze
  SLUG_FORMAT = /\A[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\z/

  has_many :organization_memberships, dependent: :restrict_with_exception
  has_many :locations, -> { order(:name) }, dependent: :restrict_with_exception
  has_many :members, dependent: :restrict_with_exception
  has_many :products, -> { order(:position, :name) }, dependent: :restrict_with_exception
  has_many :prices, dependent: :restrict_with_exception
  has_many :sales, dependent: :restrict_with_exception
  has_many :payments, dependent: :restrict_with_exception
  has_many :refunds, dependent: :restrict_with_exception
  has_many :memberships, dependent: :restrict_with_exception
  has_many :membership_periods, dependent: :restrict_with_exception
  has_many :entitlements, dependent: :restrict_with_exception
  has_many :check_ins, dependent: :restrict_with_exception

  scope :published, -> { where(published: true) }
  scope :linked_to_workos, -> { live.where.not(workos_id: nil) }

  normalizes :slug, with: ->(slug) { slug.strip.downcase }
  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true, format: { with: SLUG_FORMAT },
    exclusion: { in: RESERVED_SLUGS, message: "is reserved" }
  validates :currency, format: { with: /\A[A-Z]{3}\z/ }
  validate :timezone_known

  def self.find_by_slug(slug)
    slug = slug.to_s.strip.downcase
    return nil unless SLUG_FORMAT.match?(slug)

    find_by(slug:)
  end

  def time_zone = ActiveSupport::TimeZone[timezone]

  # Applies WorkOS organization data to an existing linked gym. Call inside a
  # transaction. Returns the outcome as a symbol.
  #
  # Sync never creates or links a gym. It changes only the name. Slug, currency,
  # timezone, publishing, and business records stay as Flowfokus set them.
  # A deletion keeps the gym and its history, keeps its WorkOS ID so nothing can
  # relink it, and removes its live staff memberships from the synced copy.
  # `authoritative`: see User.sync_from_workos!.
  def self.sync_from_workos!(data, deleted: false, at: Time.current, authoritative: false)
    workos_id = WorkosSynced.id!(data)
    version = WorkosSynced.time(data["updated_at"]) || at
    organization = lock(WorkosSynced::EXCLUSIVE).find_by(workos_id:)
    return :organization_not_linked unless organization

    if deleted
      return :already_deleted if organization.workos_deleted?

      organization.update!(workos_deleted_at: at, workos_updated_at: [ version, organization.workos_updated_at ].compact.max)
      organization.organization_memberships.live.order(:id).lock.to_a.each { _1.tombstone!(at:) }
      return :deleted
    end

    return :deleted_remotely if organization.workos_deleted?
    return :stale if organization.stale_workos_version?(version)

    same_version = organization.same_workos_version?(version)
    name = data["name"].to_s.strip
    organization.name = name if name.present?
    organization.workos_updated_at = version
    return :unchanged unless organization.changed?
    return :version_conflict if same_version && !authoritative

    organization.save!
    :updated
  end

  # Imports or repairs this gym's WorkOS identity data: its name, its staff
  # users, and every membership. Use it for the first import, after missed
  # webhooks, and to load emulator seeds. Safe to repeat.
  #
  # It reads everything from WorkOS before it writes. A failed, partial, or
  # mismatched fetch raises and changes nothing. All writes happen in one
  # transaction. Data that a newer webhook already applied is not overwritten.
  #
  # Users come from the gym's member lists, plus every live local user who has
  # ever had a membership here. Those are fetched by ID: WorkOS deletes a user's
  # memberships with the user, so a missed user.deleted leaves no other trace.
  # A 404 marks the user deleted. A user who only left this gym stays live.
  # Returns a summary hash.
  def reconcile_with_workos!(api: Flowfokus::WorkosApi.from_env, at: Time.current)
    raise ArgumentError, "#{slug} has no WorkOS organization ID." if workos_id.blank?

    summary = Hash.new(0)
    begin
      remote = WorkosSynced.fetched!(api.organization(workos_id), workos_id)
    rescue Flowfokus::WorkosApi::NotFound
      transaction { summary[:"organization_#{self.class.sync_from_workos!({ "id" => workos_id }, deleted: true, at:)}"] += 1 }
      return summary
    end

    memberships = api.organization_memberships(workos_id)
    foreign = memberships.reject { _1["organization_id"] == workos_id }
    summary[:membership_wrong_organization] += foreign.size if foreign.any?
    memberships -= foreign
    users = api.organization_users(workos_id).index_by { WorkosSynced.id!(_1) }

    # Fetch, one by one, users the lists missed: members the user list lacks,
    # and local staff that WorkOS no longer lists here.
    known = User.live.where(id: organization_memberships.select(:user_id)).pluck(:workos_id)
    deleted_user_ids = []
    (memberships.map { WorkosSynced.id!(_1, "user_id") } | known).sort.each do |user_id|
      next if users.key?(user_id)

      users[user_id] = WorkosSynced.fetched!(api.user(user_id), user_id)
    rescue Flowfokus::WorkosApi::NotFound
      deleted_user_ids << user_id
    end

    transaction do
      lock!(WorkosSynced::EXCLUSIVE)
      summary[:"organization_#{self.class.sync_from_workos!(remote, at:, authoritative: true)}"] += 1

      # Lock in the WorkosSynced order: users, then every membership this run
      # may change, in one statement.
      user_ids = (users.keys + deleted_user_ids).sort
      User.where(workos_id: user_ids).order(:workos_id).lock(WorkosSynced::EXCLUSIVE).load
      OrganizationMembership.live.where(organization: self)
        .or(OrganizationMembership.live.where(user: User.where(workos_id: deleted_user_ids)))
        .order(:id).lock.load

      user_ids.each do |user_id|
        outcome = if users.key?(user_id)
          User.sync_from_workos!(users[user_id], at:, authoritative: true)
        else
          User.sync_from_workos!({ "id" => user_id }, deleted: true, at:)
        end
        summary[:"user_#{outcome}"] += 1
      end

      remote_ids = memberships.map { WorkosSynced.id!(_1) }
      remote_user_ids = memberships.map { _1["user_id"] }
      # Live local copies that WorkOS no longer lists were deleted. Skip any that
      # a webhook changed after this fetch started.
      organization_memberships.live.includes(:user).order(:id).each do |membership|
        listed = membership.workos_id ? remote_ids.include?(membership.workos_id) : remote_user_ids.include?(membership.user.workos_id)
        next if listed || (membership.synced_at && membership.synced_at >= at)

        membership.tombstone!(at:)
        summary[:membership_deleted] += 1
      end

      memberships.each do |data|
        summary[:"membership_#{OrganizationMembership.sync_from_workos!(data, at:, authoritative: true)}"] += 1
      end

      update!(workos_synced_at: at)
    end
    summary
  end

  def overview(at: Time.current)
    day_start = at.in_time_zone(time_zone).beginning_of_day
    today = check_ins.where(checked_in_at: day_start..at).group(:result).count

    {
      member_count: members.count,
      active_membership_count: membership_periods.covering(at).distinct.count(:membership_id),
      unpaid_sale_count: sales.open.where("sales.paid_minor < sales.total_minor").count,
      awaiting_fulfillment_count: sales.open.where("sales.paid_minor = sales.total_minor").where.missing(:fulfillment).count,
      check_ins_today: { granted: today.fetch("granted", 0), denied: today.fetch("denied", 0) }
    }
  end

  def as_public_api
    {
      slug:, name:, timezone:, currency:,
      locations: locations.map { |location| { name: location.name, address: location.address } }
    }
  end

  def as_staff_api(user:, permissions:, demo:)
    {
      id:, slug:, name:, timezone:, currency:,
      locations: locations.map(&:as_api),
      actor: { name: user.name, email: user.email, demo: demo, permissions: permissions }
    }
  end

  private
    def timezone_known
      errors.add(:timezone, "is not a known time zone") unless time_zone
    end
end
