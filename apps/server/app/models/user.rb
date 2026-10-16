# Local reference to a WorkOS identity. Rails stores no passwords.
class User < ApplicationRecord
  has_many :organization_memberships, dependent: :restrict_with_exception
  has_many :members, dependent: :restrict_with_exception

  normalizes :email, with: ->(email) { email.strip.downcase }
  validates :workos_id, presence: true, uniqueness: true
  validates :email, presence: true

  def name = [ first_name, last_name ].compact_blank.join(" ").presence || email
end
