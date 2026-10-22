CREATE TRIGGER workos_events_immutable
  BEFORE UPDATE ON workos_events
  FOR EACH ROW EXECUTE FUNCTION prevent_workos_event_changes();
