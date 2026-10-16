CREATE TRIGGER sale_line_items_immutable
  BEFORE UPDATE ON sale_line_items
  FOR EACH ROW EXECUTE FUNCTION prevent_update();
