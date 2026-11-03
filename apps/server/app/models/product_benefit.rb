# A promised benefit. A catalog template, not a usable right.
class ProductBenefit < ApplicationRecord
  include TenantOwned

  belongs_to :product
  belongs_to :location, optional: true
  same_organization_as :product, :location

  validates :name, presence: true, length: { maximum: 200 }
  validate { errors.add(:location_id, "was not found") if location_id.present? && location.nil? }
  validates :kind, inclusion: { in: Entitlement::KINDS }
  validates :program_kind, inclusion: { in: Program::KINDS }, allow_nil: true
  validates :usage_limit, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validate :program_scope_shape

  def program_scope = ProgramScope.new(program_ids:, program_kind:)

  # Copied into each sale line. Later catalog edits never change a sale.
  def terms = { kind:, name:, usage_limit:, location_id:, program_ids:, program_kind: }

  def as_api = { id:, kind:, name:, usage_limit:, location_id:, program_ids:, program_kind: }

  def as_public_api(location_names, program_names = {})
    {
      kind:, name:, usage_limit:, location_name: location_id && location_names[location_id],
      program_kind:, program_names: program_ids.filter_map { program_names[_1] }
    }
  end

  private
    def program_scope_shape
      if kind == "gym_access"
        errors.add(:program_ids, "apply only to program access") if program_ids.present? || program_kind.present?
      elsif program_ids.any?(&:nil?)
        errors.add(:program_ids, "were not found")
      elsif program_ids.present?
        found = organization ? organization.programs.where(id: program_ids).count : 0
        errors.add(:program_ids, "were not found") unless found == program_ids.uniq.size
        errors.add(:program_kind, "cannot be combined with selected programs") if program_kind.present?
      end
    end
end
