module MemberArea
  class BookingsController < BaseController
    def index
      render_data Current.member.recent_bookings.map(&:as_member_api)
    end

    # Books a spot with a pass or membership the member holds.
    def create
      occurrence = Current.organization.occurrences.joins(:program).merge(Program.published).find(params.require(:occurrence_id))
      booking, created = Booking.book!(member: Current.member, occurrence_id: occurrence.id, entitlement_id: params.require(:entitlement_id))
      render_data booking.reload.as_member_api, status: created ? :created : :ok
    end

    def cancel
      # The holder cancels: their right paid for the spot.
      booking = Current.member.held_bookings.find(params[:id])
      booking.cancel!(actor: nil, reason: "Cancelled by the member.", by_member: true)
      render_data booking.reload.as_member_api
    end
  end
end
