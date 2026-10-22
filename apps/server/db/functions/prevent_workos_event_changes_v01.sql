CREATE OR REPLACE FUNCTION prevent_workos_event_changes()
RETURNS trigger AS $$
BEGIN
  IF NEW.workos_id IS DISTINCT FROM OLD.workos_id
    OR NEW.event_type IS DISTINCT FROM OLD.event_type
    OR NEW.subject_id IS DISTINCT FROM OLD.subject_id
    OR NEW.occurred_at IS DISTINCT FROM OLD.occurred_at
    OR NEW.payload IS DISTINCT FROM OLD.payload THEN
    RAISE EXCEPTION 'accepted WorkOS events are immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
