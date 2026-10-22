# Applies one accepted WorkOS event. The event row is the durable record: if
# this job is lost, the event stays pending and `bin/rails workos:events:retry`
# processes it.
class WorkosEventJob < ApplicationJob
  queue_as :default
  discard_on ActiveJob::DeserializationError

  def perform(event)
    event.process!
  end
end
