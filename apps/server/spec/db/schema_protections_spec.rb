require "rails_helper"

# The test database loads from db/schema.rb. These checks prove the dump keeps
# every database protection, including the Fx functions and triggers.
RSpec.describe "Database protections from db/schema.rb" do
  let(:connection) { ActiveRecord::Base.connection }
  let!(:actor) { demo_user }
  let!(:location) { create_location(chainsaw) }
  let!(:member) { create_member(chainsaw) }
  let!(:price) { create_offer(chainsaw) }

  before { chainsaw && demo_user }

  it "dumps functions and triggers into schema.rb" do
    schema = Rails.root.join("db/schema.rb").read

    %w[prevent_price_term_changes prevent_update].each { expect(schema).to include("create_function :#{_1}") }
    %w[prices_immutable_terms sale_line_items_immutable payments_immutable].each { expect(schema).to include("create_trigger :#{_1}") }
    expect(schema).to include('exclusion_constraint "membership_id WITH =, tsrange(starts_at, ends_at')
    expect(Rails.root.join("db/structure.sql")).not_to exist
  end

  it "has the triggers installed" do
    names = connection.select_values("SELECT tgname FROM pg_trigger WHERE NOT tgisinternal")

    expect(names).to include("prices_immutable_terms", "sale_line_items_immutable", "payments_immutable")
  end

  it "rejects price term changes that skip the model" do
    %w[amount_minor duration_days].each do |column|
      expect { in_savepoint { Price.where(id: price.id).update_all(column => 1) } }.to raise_error(ActiveRecord::StatementInvalid, /price terms are immutable/)
    end
    expect { in_savepoint { Price.where(id: price.id).update_all(currency: "USD") } }.to raise_error(ActiveRecord::StatementInvalid, /immutable/)
    expect { Price.where(id: price.id).update_all(label: "Fine", available: false) }.not_to raise_error
  end

  it "rejects deleting a price that a sale references" do
    record_sale(chainsaw, member:, price:, location:)

    expect { in_savepoint { Price.where(id: price.id).delete_all } }.to raise_error(ActiveRecord::InvalidForeignKey)
  end

  it "rejects cross-organization links that skip the model" do
    foreign_member = create_member(ironworks)
    sale = record_sale(chainsaw, member:, price:, location:)

    expect { in_savepoint { Sale.where(id: sale.id).update_all(member_id: foreign_member.id) } }.to raise_error(ActiveRecord::InvalidForeignKey)
    expect {
      in_savepoint do
        CheckIn.insert!({ organization_id: chainsaw.id, member_id: foreign_member.id, location_id: location.id,
          recorded_by_user_id: demo_user.id, result: "denied", denial_reason: "no_entitlement",
          checked_in_at: Time.current, idempotency_key: SecureRandom.uuid, request_fingerprint: "x" })
      end
    }.to raise_error(ActiveRecord::InvalidForeignKey)
  end

  it "rejects overlapping membership periods that skip the model" do
    sale = grant_access(chainsaw, member:, location:)
    period = sale.fulfillment.membership_period
    second = pay_in_full(record_sale(chainsaw, member:, price:, location:))
    second.fulfill!(actor: demo_user)
    second_period = second.reload.fulfillment.membership_period

    expect(second_period.starts_at).to eq(period.ends_at)
    expect {
      in_savepoint do
        MembershipPeriod.where(id: second_period.id).update_all(starts_at: period.ends_at - 1.second)
      end
    }.to raise_error(ActiveRecord::StatementInvalid, /membership_periods_no_overlap/)
  end

  it "rejects consumption above the usage limit" do
    grant_access(chainsaw, member:, location:, usage_limit: 1)
    right = member.entitlements.sole

    expect { in_savepoint { Entitlement.where(id: right.id).update_all(used_count: 2) } }.to raise_error(ActiveRecord::StatementInvalid, /entitlements_used_within_limit/)
  end

  it "allows one membership per member and one fulfillment per line item" do
    sale = grant_access(chainsaw, member:, location:)

    expect { in_savepoint { Membership.insert!({ organization_id: chainsaw.id, member_id: member.id }) } }.to raise_error(ActiveRecord::RecordNotUnique)
    expect {
      in_savepoint do
        Fulfillment.insert!({ organization_id: chainsaw.id, sale_line_item_id: sale.line_item.id, member_id: member.id,
          membership_id: member.membership.id, fulfilled_by_user_id: demo_user.id, fulfilled_at: Time.current })
      end
    }.to raise_error(ActiveRecord::RecordNotUnique)
  end
end
