# A one-time code that links a member record to a signed-in user.
#
# Staff create it for one member and give it to that person, at the desk or by
# their own message. The person signs in on the gym site and enters it. That
# proves the person holds both the sign-in and the code. A matching email is
# never enough. Only an HMAC digest of the code is stored. A new code replaces
# any older open code for the same member. Codes expire after seven days.
class MemberLinkCode < ApplicationRecord
  include TenantOwned

  # No 0/O, 1/I/L: the code is read aloud and typed.
  ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ".chars.freeze
  LENGTH = 12
  LIFETIME = 7.days

  class Invalid < StandardError
    def initialize(msg = "This code is not valid or has expired. Ask the front desk for a new code.") = super
  end

  class AlreadyLinked < StandardError; end

  belongs_to :member
  belongs_to :created_by_user, class_name: "User"
  belongs_to :used_by_user, class_name: "User", optional: true
  same_organization_as :member

  scope :open, ->(at = Time.current) { where(used_at: nil).where("expires_at > ?", at) }

  def self.digest(code)
    normalized = code.to_s.upcase.gsub(/[^0-9A-Z]/, "")
    OpenSSL::HMAC.hexdigest("SHA256", Rails.application.secret_key_base, "member-link:#{normalized}")
  end

  # Returns [link_code, code]. The plain code is shown once and never stored.
  def self.issue!(member:, actor:, at: Time.current)
    raise AlreadyLinked, "#{member.name} is already linked to a sign-in. Unlink first to issue a new code." if member.user_id

    code = Array.new(LENGTH) { ALPHABET[SecureRandom.random_number(ALPHABET.size)] }.join
    transaction do
      member.lock!
      member.link_codes.open(at).update_all(expires_at: at, updated_at: at)
      record = member.link_codes.create!(organization: member.organization, created_by_user: actor,
        code_digest: digest(code), expires_at: at + LIFETIME)
      [ record, code.scan(/.{4}/).join("-") ]
    end
  end

  # Links the member behind `code` to `user`. Raises Invalid for any bad,
  # used, expired, or foreign code, without saying which.
  def self.redeem!(organization:, user:, code:, at: Time.current)
    transaction do
      record = organization.member_link_codes.lock.find_by(code_digest: digest(code))
      raise Invalid unless record && record.used_at.nil? && record.expires_at > at

      member = record.member.lock!
      raise AlreadyLinked, "This member record is already linked to another sign-in. Ask the front desk." if member.user_id
      if organization.members.where(user:).exists?
        raise AlreadyLinked, "Your sign-in is already linked to a member of #{organization.name}."
      end

      member.update!(user:)
      record.update!(used_at: at, used_by_user: user)
      member
    end
  rescue ActiveRecord::RecordNotUnique
    raise AlreadyLinked, "Your sign-in is already linked to a member of #{organization.name}."
  end
end
