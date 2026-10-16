CREATE OR REPLACE FUNCTION prevent_price_term_changes()
RETURNS trigger AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.product_id IS DISTINCT FROM OLD.product_id
    OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
    OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.duration_days IS DISTINCT FROM OLD.duration_days THEN
    RAISE EXCEPTION 'price terms are immutable; create a new price' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
