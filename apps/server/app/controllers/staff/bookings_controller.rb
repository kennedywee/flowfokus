module Staff
  class BookingsController < BaseController
    # GET /staff/occurrences/:id/options?member_id=: how this member could book.
    def options
      require_permission! "programs:read"
      occurrence = current_organization.occurrences.includes(program: :location).find(params[:id])
      member = current_organization.members.find(params.require(:member_id))
      render_data booking_options(occurrence, member)
    end

    # Books a member with a right they already hold.
    def create
      require_permission! "bookings:create"
      member = current_organization.members.find(params.require(:member_id))
      booking, created = Booking.book!(
        member:, occurrence_id: params.require(:occurrence_id), entitlement_id: params.require(:entitlement_id), actor: Current.user
      )
      render_roster booking.occurrence.reload, status: created_or_replayed(created)
    end

    def cancel
      require_permission! "bookings:manage"
      booking = find_booking
      booking.cancel!(actor: Current.user, reason: params.require(:reason),
        return_use: ActiveModel::Type::Boolean.new.cast(params.fetch(:return_use, true)))
      render_roster booking.occurrence.reload
    end

    def attend
      require_permission! "bookings:manage"
      booking = find_booking
      booking.attend!(actor: Current.user)
      render_roster booking.occurrence.reload
    end

    private
      def find_booking = current_organization.bookings.includes(occurrence: { program: :location }).find(params[:id])
  end
end
