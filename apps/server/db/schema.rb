# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_16_000004) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "btree_gist"
  enable_extension "pg_catalog.plpgsql"

  create_table "benefit_grants", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "member_id", null: false
    t.uuid "fulfillment_id", null: false
    t.uuid "membership_period_id"
    t.string "origin", default: "purchase", null: false
    t.datetime "granted_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["fulfillment_id"], name: "index_benefit_grants_on_fulfillment_id", unique: true
    t.index ["id", "organization_id"], name: "index_benefit_grants_on_id_and_organization_id", unique: true
    t.index ["member_id"], name: "index_benefit_grants_on_member_id"
    t.check_constraint "origin::text = 'purchase'::text", name: "benefit_grants_origin"
  end

  create_table "check_ins", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "member_id", null: false
    t.uuid "location_id", null: false
    t.uuid "entitlement_id"
    t.uuid "recorded_by_user_id", null: false
    t.string "entry_method", default: "staff", null: false
    t.string "result", null: false
    t.string "denial_reason"
    t.datetime "checked_in_at", null: false
    t.string "idempotency_key", null: false
    t.string "request_fingerprint", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["id", "organization_id"], name: "index_check_ins_on_id_and_organization_id", unique: true
    t.index ["member_id", "checked_in_at"], name: "index_check_ins_on_member_id_and_checked_in_at"
    t.index ["organization_id", "checked_in_at"], name: "index_check_ins_on_organization_id_and_checked_in_at"
    t.index ["organization_id", "idempotency_key"], name: "index_check_ins_on_organization_id_and_idempotency_key", unique: true
    t.index ["recorded_by_user_id"], name: "index_check_ins_on_recorded_by_user_id"
    t.check_constraint "denial_reason IS NULL OR (denial_reason::text = ANY (ARRAY['no_entitlement'::character varying, 'location_not_allowed'::character varying, 'usage_limit_reached'::character varying]::text[]))", name: "check_ins_denial_reason"
    t.check_constraint "entry_method::text = 'staff'::text", name: "check_ins_entry_method"
    t.check_constraint "result::text = 'granted'::text AND denial_reason IS NULL AND entitlement_id IS NOT NULL OR result::text = 'denied'::text AND denial_reason IS NOT NULL AND entitlement_id IS NULL", name: "check_ins_result_shape"
    t.check_constraint "result::text = ANY (ARRAY['granted'::character varying, 'denied'::character varying]::text[])", name: "check_ins_result"
  end

  create_table "entitlement_usages", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "entitlement_id", null: false
    t.uuid "check_in_id", null: false
    t.datetime "used_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["check_in_id"], name: "index_entitlement_usages_on_check_in_id", unique: true
    t.index ["entitlement_id"], name: "index_entitlement_usages_on_entitlement_id"
  end

  create_table "entitlements", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "benefit_grant_id", null: false
    t.uuid "member_id", null: false
    t.uuid "location_id"
    t.string "kind", null: false
    t.string "name", null: false
    t.datetime "starts_at", null: false
    t.datetime "ends_at", null: false
    t.integer "usage_limit"
    t.integer "used_count", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["benefit_grant_id"], name: "index_entitlements_on_benefit_grant_id"
    t.index ["id", "organization_id"], name: "index_entitlements_on_id_and_organization_id", unique: true
    t.index ["member_id", "ends_at"], name: "index_entitlements_on_member_id_and_ends_at"
    t.check_constraint "ends_at > starts_at", name: "entitlements_positive_length"
    t.check_constraint "kind::text = 'gym_access'::text", name: "entitlements_kind"
    t.check_constraint "usage_limit IS NULL OR usage_limit > 0", name: "entitlements_usage_limit_positive"
    t.check_constraint "used_count >= 0 AND (usage_limit IS NULL OR used_count <= usage_limit)", name: "entitlements_used_within_limit"
  end

  create_table "fulfillments", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "sale_line_item_id", null: false
    t.uuid "member_id", null: false
    t.uuid "membership_id", null: false
    t.uuid "fulfilled_by_user_id", null: false
    t.datetime "fulfilled_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["fulfilled_by_user_id"], name: "index_fulfillments_on_fulfilled_by_user_id"
    t.index ["id", "organization_id"], name: "index_fulfillments_on_id_and_organization_id", unique: true
    t.index ["membership_id"], name: "index_fulfillments_on_membership_id"
    t.index ["sale_line_item_id"], name: "index_fulfillments_on_sale_line_item_id", unique: true
  end

  create_table "locations", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.string "name", null: false
    t.string "address"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["id", "organization_id"], name: "index_locations_on_id_and_organization_id", unique: true
    t.index ["organization_id", "name"], name: "index_locations_on_organization_id_and_name", unique: true
  end

  create_table "members", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "user_id"
    t.string "name", null: false
    t.string "email", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "organization_id, lower((email)::text)", name: "index_members_on_organization_id_and_lower_email", unique: true
    t.index ["id", "organization_id"], name: "index_members_on_id_and_organization_id", unique: true
    t.index ["organization_id", "created_at"], name: "index_members_on_organization_id_and_created_at"
    t.index ["organization_id", "user_id"], name: "index_members_on_organization_id_and_user_id", unique: true, where: "(user_id IS NOT NULL)"
    t.index ["user_id"], name: "index_members_on_user_id"
  end

  create_table "membership_periods", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "membership_id", null: false
    t.uuid "fulfillment_id", null: false
    t.datetime "starts_at", null: false
    t.datetime "ends_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["fulfillment_id"], name: "index_membership_periods_on_fulfillment_id", unique: true
    t.index ["id", "organization_id"], name: "index_membership_periods_on_id_and_organization_id", unique: true
    t.index ["membership_id", "starts_at"], name: "index_membership_periods_on_membership_id_and_starts_at"
    t.check_constraint "ends_at > starts_at", name: "membership_periods_positive_length"
    t.exclusion_constraint "membership_id WITH =, tsrange(starts_at, ends_at, '[)'::text) WITH &&", using: :gist, name: "membership_periods_no_overlap"
  end

  create_table "memberships", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "member_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["id", "organization_id"], name: "index_memberships_on_id_and_organization_id", unique: true
    t.index ["organization_id", "member_id"], name: "index_memberships_on_organization_id_and_member_id", unique: true
  end

  create_table "organization_memberships", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "user_id", null: false
    t.string "workos_id"
    t.string "role", null: false
    t.string "status", default: "active", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id", "user_id"], name: "index_organization_memberships_on_organization_id_and_user_id", unique: true
    t.index ["user_id"], name: "index_organization_memberships_on_user_id"
    t.index ["workos_id"], name: "index_organization_memberships_on_workos_id", unique: true
  end

  create_table "organizations", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "workos_id"
    t.string "name", null: false
    t.string "slug", null: false
    t.string "timezone", default: "UTC", null: false
    t.string "currency", limit: 3, null: false
    t.boolean "published", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["slug"], name: "index_organizations_on_slug", unique: true
    t.index ["workos_id"], name: "index_organizations_on_workos_id", unique: true
    t.check_constraint "currency::text ~ '^[A-Z]{3}$'::text", name: "organizations_currency_format"
    t.check_constraint "slug::text ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'::text", name: "organizations_slug_format"
  end

  create_table "payments", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "sale_id", null: false
    t.uuid "recorded_by_user_id", null: false
    t.bigint "amount_minor", null: false
    t.string "currency", limit: 3, null: false
    t.string "payment_method", null: false
    t.string "reference"
    t.datetime "received_at", null: false
    t.string "idempotency_key", null: false
    t.string "request_fingerprint", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id", "idempotency_key"], name: "index_payments_on_organization_id_and_idempotency_key", unique: true
    t.index ["recorded_by_user_id"], name: "index_payments_on_recorded_by_user_id"
    t.index ["sale_id"], name: "index_payments_on_sale_id"
    t.check_constraint "amount_minor > 0", name: "payments_amount_positive"
    t.check_constraint "payment_method::text = ANY (ARRAY['cash'::character varying, 'bank_transfer'::character varying]::text[])", name: "payments_payment_method"
  end

  create_table "prices", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "product_id", null: false
    t.string "label", null: false
    t.bigint "amount_minor", null: false
    t.string "currency", limit: 3, null: false
    t.integer "duration_days", null: false
    t.boolean "available", default: true, null: false
    t.datetime "archived_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["id", "organization_id"], name: "index_prices_on_id_and_organization_id", unique: true
    t.index ["product_id"], name: "index_prices_on_product_id"
    t.check_constraint "amount_minor >= 0", name: "prices_amount_non_negative"
    t.check_constraint "currency::text ~ '^[A-Z]{3}$'::text", name: "prices_currency_format"
    t.check_constraint "duration_days > 0", name: "prices_duration_positive"
  end

  create_table "product_benefits", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "product_id", null: false
    t.uuid "location_id"
    t.string "kind", default: "gym_access", null: false
    t.string "name", null: false
    t.integer "usage_limit"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["product_id"], name: "index_product_benefits_on_product_id"
    t.check_constraint "kind::text = 'gym_access'::text", name: "product_benefits_kind"
    t.check_constraint "usage_limit IS NULL OR usage_limit > 0", name: "product_benefits_usage_limit_positive"
  end

  create_table "products", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.string "name", null: false
    t.text "description"
    t.string "kind", default: "membership", null: false
    t.boolean "published", default: false, null: false
    t.integer "position", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["id", "organization_id"], name: "index_products_on_id_and_organization_id", unique: true
    t.index ["organization_id", "position"], name: "index_products_on_organization_id_and_position"
    t.check_constraint "kind::text = 'membership'::text", name: "products_kind"
  end

  create_table "sale_line_items", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "sale_id", null: false
    t.uuid "price_id", null: false
    t.uuid "product_id", null: false
    t.string "product_name", null: false
    t.string "price_label", null: false
    t.integer "quantity", default: 1, null: false
    t.bigint "unit_amount_minor", null: false
    t.bigint "total_minor", null: false
    t.string "currency", limit: 3, null: false
    t.jsonb "terms", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["id", "organization_id"], name: "index_sale_line_items_on_id_and_organization_id", unique: true
    t.index ["price_id"], name: "index_sale_line_items_on_price_id"
    t.index ["sale_id"], name: "index_sale_line_items_on_sale_id"
    t.check_constraint "quantity = 1", name: "sale_line_items_quantity_one"
    t.check_constraint "unit_amount_minor >= 0 AND total_minor = (unit_amount_minor * quantity)", name: "sale_line_items_total"
  end

  create_table "sales", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "organization_id", null: false
    t.uuid "member_id", null: false
    t.uuid "location_id", null: false
    t.uuid "created_by_user_id", null: false
    t.string "currency", limit: 3, null: false
    t.bigint "total_minor", null: false
    t.bigint "paid_minor", default: 0, null: false
    t.datetime "purchased_at", null: false
    t.string "idempotency_key", null: false
    t.string "request_fingerprint", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_user_id"], name: "index_sales_on_created_by_user_id"
    t.index ["id", "organization_id"], name: "index_sales_on_id_and_organization_id", unique: true
    t.index ["member_id"], name: "index_sales_on_member_id"
    t.index ["organization_id", "created_at"], name: "index_sales_on_organization_id_and_created_at"
    t.index ["organization_id", "idempotency_key"], name: "index_sales_on_organization_id_and_idempotency_key", unique: true
    t.check_constraint "currency::text ~ '^[A-Z]{3}$'::text", name: "sales_currency_format"
    t.check_constraint "paid_minor >= 0 AND paid_minor <= total_minor", name: "sales_paid_within_total"
    t.check_constraint "total_minor >= 0", name: "sales_total_non_negative"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "workos_id", null: false
    t.string "email", null: false
    t.string "first_name"
    t.string "last_name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["workos_id"], name: "index_users_on_workos_id", unique: true
  end

  add_foreign_key "benefit_grants", "fulfillments", column: ["fulfillment_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "benefit_grants", "members", column: ["member_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "benefit_grants", "membership_periods", column: ["membership_period_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "benefit_grants", "organizations"
  add_foreign_key "check_ins", "entitlements", column: ["entitlement_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "check_ins", "locations", column: ["location_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "check_ins", "members", column: ["member_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "check_ins", "organizations"
  add_foreign_key "check_ins", "users", column: "recorded_by_user_id"
  add_foreign_key "entitlement_usages", "check_ins", column: ["check_in_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "entitlement_usages", "entitlements", column: ["entitlement_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "entitlement_usages", "organizations"
  add_foreign_key "entitlements", "benefit_grants", column: ["benefit_grant_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "entitlements", "locations", column: ["location_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "entitlements", "members", column: ["member_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "entitlements", "organizations"
  add_foreign_key "fulfillments", "members", column: ["member_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "fulfillments", "memberships", column: ["membership_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "fulfillments", "organizations"
  add_foreign_key "fulfillments", "sale_line_items", column: ["sale_line_item_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "fulfillments", "users", column: "fulfilled_by_user_id"
  add_foreign_key "locations", "organizations"
  add_foreign_key "members", "organizations"
  add_foreign_key "members", "users"
  add_foreign_key "membership_periods", "fulfillments", column: ["fulfillment_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "membership_periods", "memberships", column: ["membership_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "membership_periods", "organizations"
  add_foreign_key "memberships", "members", column: ["member_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "memberships", "organizations"
  add_foreign_key "organization_memberships", "organizations"
  add_foreign_key "organization_memberships", "users"
  add_foreign_key "payments", "organizations"
  add_foreign_key "payments", "sales", column: ["sale_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "payments", "users", column: "recorded_by_user_id"
  add_foreign_key "prices", "organizations"
  add_foreign_key "prices", "products", column: ["product_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "product_benefits", "locations", column: ["location_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "product_benefits", "organizations"
  add_foreign_key "product_benefits", "products", column: ["product_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "products", "organizations"
  add_foreign_key "sale_line_items", "organizations"
  add_foreign_key "sale_line_items", "prices", column: ["price_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "sale_line_items", "products", column: ["product_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "sale_line_items", "sales", column: ["sale_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "sales", "locations", column: ["location_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "sales", "members", column: ["member_id", "organization_id"], primary_key: ["id", "organization_id"]
  add_foreign_key "sales", "organizations"
  add_foreign_key "sales", "users", column: "created_by_user_id"

  create_function :prevent_price_term_changes, sql_definition: <<-'SQL'
      CREATE OR REPLACE FUNCTION public.prevent_price_term_changes()
       RETURNS trigger
       LANGUAGE plpgsql
      AS $function$
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
      $function$
  SQL

  create_function :prevent_update, sql_definition: <<-'SQL'
      CREATE OR REPLACE FUNCTION public.prevent_update()
       RETURNS trigger
       LANGUAGE plpgsql
      AS $function$
      BEGIN
        RAISE EXCEPTION '% rows are immutable', TG_TABLE_NAME USING ERRCODE = 'check_violation';
      END;
      $function$
  SQL

  create_trigger :prices_immutable_terms, sql_definition: <<-SQL
      CREATE TRIGGER prices_immutable_terms BEFORE UPDATE ON public.prices FOR EACH ROW EXECUTE FUNCTION prevent_price_term_changes()
  SQL

  create_trigger :sale_line_items_immutable, sql_definition: <<-SQL
      CREATE TRIGGER sale_line_items_immutable BEFORE UPDATE ON public.sale_line_items FOR EACH ROW EXECUTE FUNCTION prevent_update()
  SQL

  create_trigger :payments_immutable, sql_definition: <<-SQL
      CREATE TRIGGER payments_immutable BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION prevent_update()
  SQL
end
