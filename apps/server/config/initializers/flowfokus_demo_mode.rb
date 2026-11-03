# Refuse to boot when demo authentication or test payments are requested
# outside development and test.
Rails.application.config.after_initialize do
  Flowfokus::DemoIdentity.verify_environment!
  Flowfokus::Payments.verify_environment!
end
