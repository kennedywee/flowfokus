# Who attends each spot of a ticket purchase, in order. Saved on the sale and
# the checkout as JSON:
#
#   [{ "member_id" => "…" }, { "guest_name" => "Sara", "guest_email" => nil }]
#
# The buyer holds the right that pays for every spot. Each attendee is a member
# of the same organization, or a guest known by name. Staff may name any
# member. A member buying online may name only themselves and guests, so a
# purchase never reveals other members.
class AttendeeList
  MAX = 10
  EMAIL = /\A[^@\s]+@[^@\s]+\.[^@\s]+\z/

  class Invalid < StandardError; end

  # Checks and normalizes the entries. With no entries, the buyer attends a
  # single spot. Returns a list of string-keyed hashes.
  def self.build(buyer:, quantity:, entries:, other_members: false)
    quantity = Integer(quantity || 1, exception: false)
    raise Invalid, "Choose from 1 to #{MAX} spots." unless quantity&.between?(1, MAX)

    entries = Array(entries).map { _1.respond_to?(:to_unsafe_h) ? _1.to_unsafe_h : _1.to_h }.map(&:stringify_keys)
    if entries.empty?
      raise Invalid, "Name who is coming to each of the #{quantity} spots." if quantity > 1

      return [ { "member_id" => buyer.id } ]
    end
    raise Invalid, "Name exactly #{quantity} #{quantity == 1 ? 'person' : 'people'}, one for each spot." unless entries.size == quantity

    list = entries.map { |entry| normalize(entry, buyer:, other_members:) }
    member_ids = list.filter_map { _1["member_id"] }
    raise Invalid, "Each member can take only one spot." unless member_ids.uniq.size == member_ids.size

    list
  end

  def self.normalize(entry, buyer:, other_members:)
    if ActiveModel::Type::Boolean.new.cast(entry["self"]) || entry["member_id"].to_s.casecmp?(buyer.id)
      return { "member_id" => buyer.id }
    end

    if entry["member_id"].present?
      raise Invalid, "You can add only yourself and guests." unless other_members

      member = buyer.organization.members.find_by(id: entry["member_id"].to_s) || raise(Invalid, "That member was not found.")
      return { "member_id" => member.id }
    end

    name = entry["guest_name"].to_s.squish
    raise Invalid, "Give each guest a name." if name.empty?
    raise Invalid, "Guest names can be at most 200 characters." if name.length > 200

    email = entry["guest_email"].to_s.strip.downcase.presence
    raise Invalid, "#{name}'s email address is not valid." if email && (email.length > 320 || !EMAIL.match?(email))

    { "guest_name" => name, "guest_email" => email }
  end

  # The booking attributes for each attendee: a member or a guest.
  def self.booking_attributes(organization, list)
    members = organization.members.where(id: list.filter_map { _1["member_id"] }).index_by(&:id)
    list.map do |entry|
      if entry["member_id"]
        { member: members.fetch(entry["member_id"]) }
      else
        { guest_name: entry["guest_name"], guest_email: entry["guest_email"] }
      end
    end
  end

  # Display form: { member_id:, name:, guest: }.
  def self.as_api(organization, list)
    names = organization.members.where(id: list.filter_map { _1["member_id"] }).pluck(:id, :name).to_h
    list.map do |entry|
      if entry["member_id"]
        { member_id: entry["member_id"], name: names[entry["member_id"]] || "A member", guest: false }
      else
        { member_id: nil, name: entry["guest_name"], guest: true }
      end
    end
  end
end
