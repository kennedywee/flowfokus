# Refuse to boot when demo authentication is requested outside development and test.
Rails.application.config.after_initialize do
  Hydraflow::DemoIdentity.verify_environment!
end
