# Which programs a program_access benefit or entitlement covers:
# selected programs when `program_ids` is set, otherwise every program of
# `program_kind`, otherwise every program.
ProgramScope = Data.define(:program_ids, :program_kind) do
  def covers?(program)
    if program_ids.present? then program_ids.include?(program.id)
    elsif program_kind then program.kind == program_kind
    else true
    end
  end

  # Programs in `programs` that this scope covers.
  def select(programs) = programs.select { covers?(_1) }
end
