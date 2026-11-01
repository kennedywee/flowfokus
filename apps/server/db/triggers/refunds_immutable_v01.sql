CREATE TRIGGER refunds_immutable
  BEFORE UPDATE ON refunds
  FOR EACH ROW EXECUTE FUNCTION prevent_update();
