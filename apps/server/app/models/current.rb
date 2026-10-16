class Current < ActiveSupport::CurrentAttributes
  attribute :user, :organization, :member, :audience, :permissions, :demo
end
