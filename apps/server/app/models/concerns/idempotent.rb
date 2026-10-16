# Retry-safe creation keyed by the client's Idempotency-Key.
#
# The same key with the same request returns the first record. The same key
# with a different request raises KeyReused. Keys are unique per organization
# in the database, so concurrent retries cannot create two records.
module Idempotent
  extend ActiveSupport::Concern

  class KeyReused < StandardError
    def initialize(msg = "This Idempotency-Key was used for a different request.") = super
  end

  KEY_FORMAT = /\A[\x21-\x7E]{8,255}\z/

  def self.valid_key?(key) = KEY_FORMAT.match?(key.to_s)

  def self.fingerprint(**attributes)
    Digest::SHA256.hexdigest(attributes.sort.to_h.transform_values(&:to_s).to_json)
  end

  class_methods do
    # Yields only when the key is new. Returns [record, created].
    def with_idempotency(scope, key:, fingerprint:)
      if (existing = replay(scope, key:, fingerprint:))
        return [ existing, false ]
      end

      [ yield, true ]
    rescue ActiveRecord::RecordNotUnique => error
      raise unless error.message.include?("idempotency_key")

      [ replay(scope, key:, fingerprint:) || raise, false ]
    end

    def replay(scope, key:, fingerprint:)
      existing = scope.find_by(idempotency_key: key)
      return nil unless existing
      raise KeyReused unless existing.request_fingerprint == fingerprint

      existing
    end
  end
end
