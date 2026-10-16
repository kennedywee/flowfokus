CREATE TRIGGER payments_immutable
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION prevent_update();
