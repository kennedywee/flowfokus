# A feature flag's state for one organization: Off, Labs, or On.
#
# - Off: the organization does not have the feature.
# - Labs: Settings, Labs lists it. Staff with settings:manage turn it on or off.
# - On: the organization has the feature. Labs does not list it.
#
# The list of features lives here. A missing row means Off. Staff with
# features:manage (the Developer role) set the state.
class Feature < ApplicationRecord
  include TenantOwned

  LIST = {
    "gym_site" => {
      name: "Gym site",
      description: "Public pages, the shop, and the member area at the gym's own address."
    }
  }.freeze
  STATES = %w[ off labs on ].freeze

  scope :in_effect, -> { where(state: "on").or(where(state: "labs", enabled: true)) }

  validates :key, inclusion: { in: LIST.keys }, uniqueness: { scope: :organization_id }
  validates :state, inclusion: { in: STATES }
  # Leaving Labs clears the organization's choice, so a feature that comes back
  # to Labs starts turned off.
  before_validation { self.enabled = false unless labs? }

  def self.known?(key) = LIST.key?(key.to_s)

  def labs? = state == "labs"
  def in_effect? = state == "on" || (labs? && enabled?)

  def name = LIST.dig(key, :name)
  def description = LIST.dig(key, :description)

  def as_api
    { key:, name:, description:, state:, enabled:, in_effect: in_effect? }
  end

  def as_labs_api
    { key:, name:, description:, enabled: }
  end
end
