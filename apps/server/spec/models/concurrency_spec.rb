require "rails_helper"

# Runs real parallel transactions. Commits data, so it cleans up afterwards.
RSpec.describe "Concurrent writes" do
  self.use_transactional_tests = false

  after do
    tables = ActiveRecord::Base.connection.tables - %w[schema_migrations ar_internal_metadata]
    ActiveRecord::Base.connection.execute("TRUNCATE #{tables.map { %("#{_1}") }.join(', ')} CASCADE")
  end

  let(:location) { create_location(chainsaw) }
  let(:member) { create_member(chainsaw) }

  def in_parallel(count)
    gate = Concurrent::CountDownLatch.new(1)
    threads = count.times.map do |index|
      Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          gate.wait
          yield index
        rescue StandardError => error
          error
        end
      end
    end
    gate.count_down
    threads.map(&:value)
  end

  before { demo_user && location && member }

  it "consumes a single remaining use once" do
    grant_access(chainsaw, member:, location:, usage_limit: 1)

    results = in_parallel(4) do
      CheckIn.record!(organization: chainsaw, actor: demo_user, idempotency_key: SecureRandom.uuid,
        member_id: member.id, location_id: location.id).first.result
    end

    expect(results.tally).to eq("granted" => 1, "denied" => 3)
    expect(member.entitlements.sole.reload.used_count).to eq(1)
  end

  it "records one check-in for parallel retries of the same key" do
    grant_access(chainsaw, member:, location:, usage_limit: 5)
    key = SecureRandom.uuid

    results = in_parallel(4) do
      CheckIn.record!(organization: chainsaw, actor: demo_user, idempotency_key: key,
        member_id: member.id, location_id: location.id).first.id
    end

    expect(results.uniq.size).to eq(1)
    expect(CheckIn.count).to eq(1)
    expect(member.entitlements.sole.reload.used_count).to eq(1)
  end

  it "fulfills parallel renewals without overlap" do
    price = create_offer(chainsaw, duration_days: 30)
    sales = 3.times.map { pay_in_full(record_sale(chainsaw, member:, price:, location:)) }

    results = in_parallel(3) { |index| Sale.find(sales[index].id).fulfill!(actor: demo_user).last }

    expect(results).to all(be(true))
    periods = member.reload.membership.periods.to_a
    expect(periods.size).to eq(3)
    periods.each_cons(2) { |earlier, later| expect(later.starts_at).to eq(earlier.ends_at) }
  end

  it "fulfills the same sale once under parallel retries" do
    sale = pay_in_full(record_sale(chainsaw, member:, price: create_offer(chainsaw), location:))

    results = in_parallel(4) { Sale.find(sale.id).fulfill!(actor: demo_user).last }

    expect(results.count(true)).to eq(1)
    expect(Fulfillment.count).to eq(1)
    expect(Entitlement.count).to eq(1)
  end

  it "never overpays under parallel payments" do
    sale = record_sale(chainsaw, member:, price: create_offer(chainsaw, amount_minor: 10_000), location:)

    results = in_parallel(4) do
      Sale.find(sale.id).record_payment!(actor: demo_user, idempotency_key: SecureRandom.uuid, amount_minor: 6_000, method: "cash")
      :paid
    end

    expect(results.count(:paid)).to eq(1)
    expect(results.grep(Payment::Overpayment).size).to eq(3)
    expect(sale.reload.paid_minor).to eq(6_000)
  end
end
