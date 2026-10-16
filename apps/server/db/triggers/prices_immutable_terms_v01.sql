CREATE TRIGGER prices_immutable_terms
  BEFORE UPDATE ON prices
  FOR EACH ROW EXECUTE FUNCTION prevent_price_term_changes();
