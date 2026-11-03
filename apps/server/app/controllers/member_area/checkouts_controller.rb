module MemberArea
  # Online purchases. The member opens a checkout, pays with the provider, and
  # comes back to see the result.
  class CheckoutsController < BaseController
    limit_requests to: 30, within: 10.minutes, only: :create

    def create
      checkout, created = Checkout.open!(
        member: Current.member, idempotency_key: idempotency_key!,
        price_id: params.require(:price_id), occurrence_id: params[:occurrence_id].presence
      )
      render_data find_checkout(checkout.id).as_member_api, status: created ? :created : :ok
    end

    def show
      render_data find_checkout.as_member_api
    end

    def cancel
      checkout = find_checkout
      checkout.cancel!
      render_data checkout.reload.as_member_api
    end

    # POST /member/checkouts/:id/test_payment: the local test provider's
    # payment page. Unavailable unless test payments are on.
    def test_payment
      checkout = find_checkout
      unless Flowfokus::Payments.enabled? && Flowfokus::Payments.test_provider?(checkout.provider)
        raise ErrorResponses::RequestError.new(:not_found, "not_found", "Test payments are not available.")
      end

      checkout.complete!
      render_data find_checkout(checkout.id).as_member_api
    end

    private
      def find_checkout(id = params[:id])
        Current.member.checkouts.includes({ price: :product }, { occurrence: :program }, :booking).find(id)
      end

      def idempotency_key!
        key = request.headers["Idempotency-Key"]
        raise ErrorResponses::RequestError.new(:bad_request, "idempotency_key_required", "Send an Idempotency-Key header.") if key.blank?
        unless Idempotent.valid_key?(key)
          raise ErrorResponses::RequestError.new(:bad_request, "bad_request", "Idempotency-Key must be 8 to 255 printable ASCII characters.")
        end

        key
      end
  end
end
