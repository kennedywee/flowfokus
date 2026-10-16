SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: prevent_price_term_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_price_term_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: prevent_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION '% rows are immutable', TG_TABLE_NAME USING ERRCODE = 'check_violation';
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ar_internal_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ar_internal_metadata (
    key character varying NOT NULL,
    value character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: benefit_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.benefit_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    member_id uuid NOT NULL,
    fulfillment_id uuid NOT NULL,
    membership_period_id uuid,
    origin character varying DEFAULT 'purchase'::character varying NOT NULL,
    granted_at timestamp(6) without time zone NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT benefit_grants_origin CHECK (((origin)::text = 'purchase'::text))
);


--
-- Name: check_ins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.check_ins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    member_id uuid NOT NULL,
    location_id uuid NOT NULL,
    entitlement_id uuid,
    recorded_by_user_id uuid NOT NULL,
    entry_method character varying DEFAULT 'staff'::character varying NOT NULL,
    result character varying NOT NULL,
    denial_reason character varying,
    checked_in_at timestamp(6) without time zone NOT NULL,
    idempotency_key character varying NOT NULL,
    request_fingerprint character varying NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT check_ins_denial_reason CHECK (((denial_reason IS NULL) OR ((denial_reason)::text = ANY ((ARRAY['no_entitlement'::character varying, 'location_not_allowed'::character varying, 'usage_limit_reached'::character varying])::text[])))),
    CONSTRAINT check_ins_entry_method CHECK (((entry_method)::text = 'staff'::text)),
    CONSTRAINT check_ins_result CHECK (((result)::text = ANY ((ARRAY['granted'::character varying, 'denied'::character varying])::text[]))),
    CONSTRAINT check_ins_result_shape CHECK (((((result)::text = 'granted'::text) AND (denial_reason IS NULL) AND (entitlement_id IS NOT NULL)) OR (((result)::text = 'denied'::text) AND (denial_reason IS NOT NULL) AND (entitlement_id IS NULL))))
);


--
-- Name: entitlement_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entitlement_usages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    entitlement_id uuid NOT NULL,
    check_in_id uuid NOT NULL,
    used_at timestamp(6) without time zone NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: entitlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entitlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    benefit_grant_id uuid NOT NULL,
    member_id uuid NOT NULL,
    location_id uuid,
    kind character varying NOT NULL,
    name character varying NOT NULL,
    starts_at timestamp(6) without time zone NOT NULL,
    ends_at timestamp(6) without time zone NOT NULL,
    usage_limit integer,
    used_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT entitlements_kind CHECK (((kind)::text = 'gym_access'::text)),
    CONSTRAINT entitlements_positive_length CHECK ((ends_at > starts_at)),
    CONSTRAINT entitlements_usage_limit_positive CHECK (((usage_limit IS NULL) OR (usage_limit > 0))),
    CONSTRAINT entitlements_used_within_limit CHECK (((used_count >= 0) AND ((usage_limit IS NULL) OR (used_count <= usage_limit))))
);


--
-- Name: fulfillments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fulfillments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    sale_line_item_id uuid NOT NULL,
    member_id uuid NOT NULL,
    membership_id uuid NOT NULL,
    fulfilled_by_user_id uuid NOT NULL,
    fulfilled_at timestamp(6) without time zone NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    address character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid,
    name character varying NOT NULL,
    email character varying NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: membership_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.membership_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    membership_id uuid NOT NULL,
    fulfillment_id uuid NOT NULL,
    starts_at timestamp(6) without time zone NOT NULL,
    ends_at timestamp(6) without time zone NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT membership_periods_positive_length CHECK ((ends_at > starts_at))
);


--
-- Name: memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    member_id uuid NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: organization_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    workos_id character varying,
    role character varying NOT NULL,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workos_id character varying,
    name character varying NOT NULL,
    slug character varying NOT NULL,
    timezone character varying DEFAULT 'UTC'::character varying NOT NULL,
    currency character varying(3) NOT NULL,
    published boolean DEFAULT false NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT organizations_currency_format CHECK (((currency)::text ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT organizations_slug_format CHECK (((slug)::text ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'::text))
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    sale_id uuid NOT NULL,
    recorded_by_user_id uuid NOT NULL,
    amount_minor bigint NOT NULL,
    currency character varying(3) NOT NULL,
    payment_method character varying NOT NULL,
    reference character varying,
    received_at timestamp(6) without time zone NOT NULL,
    idempotency_key character varying NOT NULL,
    request_fingerprint character varying NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT payments_amount_positive CHECK ((amount_minor > 0)),
    CONSTRAINT payments_payment_method CHECK (((payment_method)::text = ANY ((ARRAY['cash'::character varying, 'bank_transfer'::character varying])::text[])))
);


--
-- Name: prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    product_id uuid NOT NULL,
    label character varying NOT NULL,
    amount_minor bigint NOT NULL,
    currency character varying(3) NOT NULL,
    duration_days integer NOT NULL,
    available boolean DEFAULT true NOT NULL,
    archived_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT prices_amount_non_negative CHECK ((amount_minor >= 0)),
    CONSTRAINT prices_currency_format CHECK (((currency)::text ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT prices_duration_positive CHECK ((duration_days > 0))
);


--
-- Name: product_benefits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_benefits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    product_id uuid NOT NULL,
    location_id uuid,
    kind character varying DEFAULT 'gym_access'::character varying NOT NULL,
    name character varying NOT NULL,
    usage_limit integer,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT product_benefits_kind CHECK (((kind)::text = 'gym_access'::text)),
    CONSTRAINT product_benefits_usage_limit_positive CHECK (((usage_limit IS NULL) OR (usage_limit > 0)))
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    description text,
    kind character varying DEFAULT 'membership'::character varying NOT NULL,
    published boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT products_kind CHECK (((kind)::text = 'membership'::text))
);


--
-- Name: sale_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_line_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    sale_id uuid NOT NULL,
    price_id uuid NOT NULL,
    product_id uuid NOT NULL,
    product_name character varying NOT NULL,
    price_label character varying NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_amount_minor bigint NOT NULL,
    total_minor bigint NOT NULL,
    currency character varying(3) NOT NULL,
    terms jsonb NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT sale_line_items_quantity_one CHECK ((quantity = 1)),
    CONSTRAINT sale_line_items_total CHECK (((unit_amount_minor >= 0) AND (total_minor = (unit_amount_minor * quantity))))
);


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    member_id uuid NOT NULL,
    location_id uuid NOT NULL,
    created_by_user_id uuid NOT NULL,
    currency character varying(3) NOT NULL,
    total_minor bigint NOT NULL,
    paid_minor bigint DEFAULT 0 NOT NULL,
    purchased_at timestamp(6) without time zone NOT NULL,
    idempotency_key character varying NOT NULL,
    request_fingerprint character varying NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT sales_currency_format CHECK (((currency)::text ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT sales_paid_within_total CHECK (((paid_minor >= 0) AND (paid_minor <= total_minor))),
    CONSTRAINT sales_total_non_negative CHECK ((total_minor >= 0))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workos_id character varying NOT NULL,
    email character varying NOT NULL,
    first_name character varying,
    last_name character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: ar_internal_metadata ar_internal_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_internal_metadata
    ADD CONSTRAINT ar_internal_metadata_pkey PRIMARY KEY (key);


--
-- Name: benefit_grants benefit_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benefit_grants
    ADD CONSTRAINT benefit_grants_pkey PRIMARY KEY (id);


--
-- Name: check_ins check_ins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_pkey PRIMARY KEY (id);


--
-- Name: entitlement_usages entitlement_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entitlement_usages
    ADD CONSTRAINT entitlement_usages_pkey PRIMARY KEY (id);


--
-- Name: entitlements entitlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entitlements
    ADD CONSTRAINT entitlements_pkey PRIMARY KEY (id);


--
-- Name: fulfillments fulfillments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fulfillments
    ADD CONSTRAINT fulfillments_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: members members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (id);


--
-- Name: membership_periods membership_periods_no_overlap; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_periods
    ADD CONSTRAINT membership_periods_no_overlap EXCLUDE USING gist (membership_id WITH =, tsrange(starts_at, ends_at, '[)'::text) WITH &&);


--
-- Name: membership_periods membership_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_periods
    ADD CONSTRAINT membership_periods_pkey PRIMARY KEY (id);


--
-- Name: memberships memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_pkey PRIMARY KEY (id);


--
-- Name: organization_memberships organization_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_memberships
    ADD CONSTRAINT organization_memberships_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: prices prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prices
    ADD CONSTRAINT prices_pkey PRIMARY KEY (id);


--
-- Name: product_benefits product_benefits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_benefits
    ADD CONSTRAINT product_benefits_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: sale_line_items sale_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_line_items
    ADD CONSTRAINT sale_line_items_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: index_benefit_grants_on_fulfillment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_benefit_grants_on_fulfillment_id ON public.benefit_grants USING btree (fulfillment_id);


--
-- Name: index_benefit_grants_on_id_and_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_benefit_grants_on_id_and_organization_id ON public.benefit_grants USING btree (id, organization_id);


--
-- Name: index_benefit_grants_on_member_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_benefit_grants_on_member_id ON public.benefit_grants USING btree (member_id);


--
-- Name: index_check_ins_on_id_and_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_check_ins_on_id_and_organization_id ON public.check_ins USING btree (id, organization_id);


--
-- Name: index_check_ins_on_member_id_and_checked_in_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_check_ins_on_member_id_and_checked_in_at ON public.check_ins USING btree (member_id, checked_in_at);


--
-- Name: index_check_ins_on_organization_id_and_checked_in_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_check_ins_on_organization_id_and_checked_in_at ON public.check_ins USING btree (organization_id, checked_in_at);


--
-- Name: index_check_ins_on_organization_id_and_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_check_ins_on_organization_id_and_idempotency_key ON public.check_ins USING btree (organization_id, idempotency_key);


--
-- Name: index_check_ins_on_recorded_by_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_check_ins_on_recorded_by_user_id ON public.check_ins USING btree (recorded_by_user_id);


--
-- Name: index_entitlement_usages_on_check_in_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_entitlement_usages_on_check_in_id ON public.entitlement_usages USING btree (check_in_id);


--
-- Name: index_entitlement_usages_on_entitlement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_entitlement_usages_on_entitlement_id ON public.entitlement_usages USING btree (entitlement_id);


--
-- Name: index_entitlements_on_benefit_grant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_entitlements_on_benefit_grant_id ON public.entitlements USING btree (benefit_grant_id);


--
-- Name: index_entitlements_on_id_and_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_entitlements_on_id_and_organization_id ON public.entitlements USING btree (id, organization_id);


--
-- Name: index_entitlements_on_member_id_and_ends_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_entitlements_on_member_id_and_ends_at ON public.entitlements USING btree (member_id, ends_at);


--
-- Name: index_fulfillments_on_fulfilled_by_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_fulfillments_on_fulfilled_by_user_id ON public.fulfillments USING btree (fulfilled_by_user_id);


--
-- Name: index_fulfillments_on_id_and_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_fulfillments_on_id_and_organization_id ON public.fulfillments USING btree (id, organization_id);


--
-- Name: index_fulfillments_on_membership_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_fulfillments_on_membership_id ON public.fulfillments USING btree (membership_id);


--
-- Name: index_fulfillments_on_sale_line_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_fulfillments_on_sale_line_item_id ON public.fulfillments USING btree (sale_line_item_id);


--
-- Name: index_locations_on_id_and_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_locations_on_id_and_organization_id ON public.locations USING btree (id, organization_id);


--
-- Name: index_locations_on_organization_id_and_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_locations_on_organization_id_and_name ON public.locations USING btree (organization_id, name);


--
-- Name: index_members_on_id_and_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_members_on_id_and_organization_id ON public.members USING btree (id, organization_id);


--
-- Name: index_members_on_organization_id_and_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_members_on_organization_id_and_created_at ON public.members USING btree (organization_id, created_at);


--
-- Name: index_members_on_organization_id_and_lower_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_members_on_organization_id_and_lower_email ON public.members USING btree (organization_id, lower((email)::text));


--
-- Name: index_members_on_organization_id_and_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_members_on_organization_id_and_user_id ON public.members USING btree (organization_id, user_id) WHERE (user_id IS NOT NULL);


--
-- Name: index_members_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_members_on_user_id ON public.members USING btree (user_id);


--
-- Name: index_membership_periods_on_fulfillment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_membership_periods_on_fulfillment_id ON public.membership_periods USING btree (fulfillment_id);


--
-- Name: index_membership_periods_on_id_and_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_membership_periods_on_id_and_organization_id ON public.membership_periods USING btree (id, organization_id);


--
-- Name: index_membership_periods_on_membership_id_and_starts_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_membership_periods_on_membership_id_and_starts_at ON public.membership_periods USING btree (membership_id, starts_at);


--
-- Name: index_memberships_on_id_and_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_memberships_on_id_and_organization_id ON public.memberships USING btree (id, organization_id);


--
-- Name: index_memberships_on_organization_id_and_member_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_memberships_on_organization_id_and_member_id ON public.memberships USING btree (organization_id, member_id);


--
-- Name: index_organization_memberships_on_organization_id_and_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_organization_memberships_on_organization_id_and_user_id ON public.organization_memberships USING btree (organization_id, user_id);


--
-- Name: index_organization_memberships_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_organization_memberships_on_user_id ON public.organization_memberships USING btree (user_id);


--
-- Name: index_organization_memberships_on_workos_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_organization_memberships_on_workos_id ON public.organization_memberships USING btree (workos_id);


--
-- Name: index_organizations_on_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_organizations_on_slug ON public.organizations USING btree (slug);


--
-- Name: index_organizations_on_workos_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_organizations_on_workos_id ON public.organizations USING btree (workos_id);


--
-- Name: index_payments_on_organization_id_and_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_payments_on_organization_id_and_idempotency_key ON public.payments USING btree (organization_id, idempotency_key);


--
-- Name: index_payments_on_recorded_by_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_payments_on_recorded_by_user_id ON public.payments USING btree (recorded_by_user_id);


--
-- Name: index_payments_on_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_payments_on_sale_id ON public.payments USING btree (sale_id);


--
-- Name: index_prices_on_id_and_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_prices_on_id_and_organization_id ON public.prices USING btree (id, organization_id);


--
-- Name: index_prices_on_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_prices_on_product_id ON public.prices USING btree (product_id);


--
-- Name: index_product_benefits_on_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_product_benefits_on_product_id ON public.product_benefits USING btree (product_id);


--
-- Name: index_products_on_id_and_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_products_on_id_and_organization_id ON public.products USING btree (id, organization_id);


--
-- Name: index_products_on_organization_id_and_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_products_on_organization_id_and_position ON public.products USING btree (organization_id, "position");


--
-- Name: index_sale_line_items_on_id_and_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_sale_line_items_on_id_and_organization_id ON public.sale_line_items USING btree (id, organization_id);


--
-- Name: index_sale_line_items_on_price_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sale_line_items_on_price_id ON public.sale_line_items USING btree (price_id);


--
-- Name: index_sale_line_items_on_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sale_line_items_on_sale_id ON public.sale_line_items USING btree (sale_id);


--
-- Name: index_sales_on_created_by_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sales_on_created_by_user_id ON public.sales USING btree (created_by_user_id);


--
-- Name: index_sales_on_id_and_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_sales_on_id_and_organization_id ON public.sales USING btree (id, organization_id);


--
-- Name: index_sales_on_member_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sales_on_member_id ON public.sales USING btree (member_id);


--
-- Name: index_sales_on_organization_id_and_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sales_on_organization_id_and_created_at ON public.sales USING btree (organization_id, created_at);


--
-- Name: index_sales_on_organization_id_and_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_sales_on_organization_id_and_idempotency_key ON public.sales USING btree (organization_id, idempotency_key);


--
-- Name: index_users_on_workos_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_workos_id ON public.users USING btree (workos_id);


--
-- Name: payments payments_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payments_immutable BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.prevent_update();


--
-- Name: prices prices_immutable_terms; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prices_immutable_terms BEFORE UPDATE ON public.prices FOR EACH ROW EXECUTE FUNCTION public.prevent_price_term_changes();


--
-- Name: sale_line_items sale_line_items_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sale_line_items_immutable BEFORE UPDATE ON public.sale_line_items FOR EACH ROW EXECUTE FUNCTION public.prevent_update();


--
-- Name: fulfillments fk_rails_0f74006c05; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fulfillments
    ADD CONSTRAINT fk_rails_0f74006c05 FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: fulfillments fk_rails_1509ea24c6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fulfillments
    ADD CONSTRAINT fk_rails_1509ea24c6 FOREIGN KEY (membership_id, organization_id) REFERENCES public.memberships(id, organization_id);


--
-- Name: entitlements fk_rails_168fc9c644; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entitlements
    ADD CONSTRAINT fk_rails_168fc9c644 FOREIGN KEY (benefit_grant_id, organization_id) REFERENCES public.benefit_grants(id, organization_id);


--
-- Name: members fk_rails_2e88fb7ce9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT fk_rails_2e88fb7ce9 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: products fk_rails_37c75ac37a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_rails_37c75ac37a FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: payments fk_rails_3ab959bfc4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fk_rails_3ab959bfc4 FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: sales fk_rails_41d6706276; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT fk_rails_41d6706276 FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id);


--
-- Name: sales fk_rails_48317ca9b5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT fk_rails_48317ca9b5 FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: prices fk_rails_519c061c98; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prices
    ADD CONSTRAINT fk_rails_519c061c98 FOREIGN KEY (product_id, organization_id) REFERENCES public.products(id, organization_id);


--
-- Name: membership_periods fk_rails_519d0a3930; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_periods
    ADD CONSTRAINT fk_rails_519d0a3930 FOREIGN KEY (fulfillment_id, organization_id) REFERENCES public.fulfillments(id, organization_id);


--
-- Name: membership_periods fk_rails_51b45cfd8c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_periods
    ADD CONSTRAINT fk_rails_51b45cfd8c FOREIGN KEY (membership_id, organization_id) REFERENCES public.memberships(id, organization_id);


--
-- Name: fulfillments fk_rails_5516c50848; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fulfillments
    ADD CONSTRAINT fk_rails_5516c50848 FOREIGN KEY (fulfilled_by_user_id) REFERENCES public.users(id);


--
-- Name: organization_memberships fk_rails_57cf70d280; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_memberships
    ADD CONSTRAINT fk_rails_57cf70d280 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: check_ins fk_rails_5b8cac5b9d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT fk_rails_5b8cac5b9d FOREIGN KEY (recorded_by_user_id) REFERENCES public.users(id);


--
-- Name: product_benefits fk_rails_5d10316506; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_benefits
    ADD CONSTRAINT fk_rails_5d10316506 FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: entitlements fk_rails_5fe8622152; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entitlements
    ADD CONSTRAINT fk_rails_5fe8622152 FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: memberships fk_rails_64267aab58; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT fk_rails_64267aab58 FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: prices fk_rails_680774dc0c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prices
    ADD CONSTRAINT fk_rails_680774dc0c FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: organization_memberships fk_rails_715ab7f4fe; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_memberships
    ADD CONSTRAINT fk_rails_715ab7f4fe FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: entitlements fk_rails_7746ae6362; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entitlements
    ADD CONSTRAINT fk_rails_7746ae6362 FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id);


--
-- Name: payments fk_rails_789eb5692a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fk_rails_789eb5692a FOREIGN KEY (recorded_by_user_id) REFERENCES public.users(id);


--
-- Name: members fk_rails_78a5bdebf7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT fk_rails_78a5bdebf7 FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: locations fk_rails_84778edc55; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT fk_rails_84778edc55 FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: check_ins fk_rails_84e177d05d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT fk_rails_84e177d05d FOREIGN KEY (member_id, organization_id) REFERENCES public.members(id, organization_id);


--
-- Name: fulfillments fk_rails_8a7dfa0863; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fulfillments
    ADD CONSTRAINT fk_rails_8a7dfa0863 FOREIGN KEY (member_id, organization_id) REFERENCES public.members(id, organization_id);


--
-- Name: sale_line_items fk_rails_8aa7dc557c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_line_items
    ADD CONSTRAINT fk_rails_8aa7dc557c FOREIGN KEY (price_id, organization_id) REFERENCES public.prices(id, organization_id);


--
-- Name: product_benefits fk_rails_8d5dde4012; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_benefits
    ADD CONSTRAINT fk_rails_8d5dde4012 FOREIGN KEY (product_id, organization_id) REFERENCES public.products(id, organization_id);


--
-- Name: sales fk_rails_946a6454f3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT fk_rails_946a6454f3 FOREIGN KEY (member_id, organization_id) REFERENCES public.members(id, organization_id);


--
-- Name: membership_periods fk_rails_9631221c55; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_periods
    ADD CONSTRAINT fk_rails_9631221c55 FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: entitlement_usages fk_rails_966ef390b5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entitlement_usages
    ADD CONSTRAINT fk_rails_966ef390b5 FOREIGN KEY (entitlement_id, organization_id) REFERENCES public.entitlements(id, organization_id);


--
-- Name: benefit_grants fk_rails_9c8b2923ee; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benefit_grants
    ADD CONSTRAINT fk_rails_9c8b2923ee FOREIGN KEY (fulfillment_id, organization_id) REFERENCES public.fulfillments(id, organization_id);


--
-- Name: benefit_grants fk_rails_9d0c0b9f23; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benefit_grants
    ADD CONSTRAINT fk_rails_9d0c0b9f23 FOREIGN KEY (member_id, organization_id) REFERENCES public.members(id, organization_id);


--
-- Name: entitlement_usages fk_rails_a16df92164; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entitlement_usages
    ADD CONSTRAINT fk_rails_a16df92164 FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: product_benefits fk_rails_a56283feeb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_benefits
    ADD CONSTRAINT fk_rails_a56283feeb FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id);


--
-- Name: payments fk_rails_a6e6f0be74; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fk_rails_a6e6f0be74 FOREIGN KEY (sale_id, organization_id) REFERENCES public.sales(id, organization_id);


--
-- Name: check_ins fk_rails_a76a0ef4d3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT fk_rails_a76a0ef4d3 FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: memberships fk_rails_af6e0fbd95; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT fk_rails_af6e0fbd95 FOREIGN KEY (member_id, organization_id) REFERENCES public.members(id, organization_id);


--
-- Name: sale_line_items fk_rails_c25a1feb7d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_line_items
    ADD CONSTRAINT fk_rails_c25a1feb7d FOREIGN KEY (product_id, organization_id) REFERENCES public.products(id, organization_id);


--
-- Name: sales fk_rails_c77d803744; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT fk_rails_c77d803744 FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: entitlements fk_rails_d083d35618; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entitlements
    ADD CONSTRAINT fk_rails_d083d35618 FOREIGN KEY (member_id, organization_id) REFERENCES public.members(id, organization_id);


--
-- Name: check_ins fk_rails_d15e8ee78c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT fk_rails_d15e8ee78c FOREIGN KEY (entitlement_id, organization_id) REFERENCES public.entitlements(id, organization_id);


--
-- Name: benefit_grants fk_rails_debdbb5cdc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benefit_grants
    ADD CONSTRAINT fk_rails_debdbb5cdc FOREIGN KEY (membership_period_id, organization_id) REFERENCES public.membership_periods(id, organization_id);


--
-- Name: sale_line_items fk_rails_e35c26a0d6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_line_items
    ADD CONSTRAINT fk_rails_e35c26a0d6 FOREIGN KEY (sale_id, organization_id) REFERENCES public.sales(id, organization_id);


--
-- Name: entitlement_usages fk_rails_e7cca32ff5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entitlement_usages
    ADD CONSTRAINT fk_rails_e7cca32ff5 FOREIGN KEY (check_in_id, organization_id) REFERENCES public.check_ins(id, organization_id);


--
-- Name: fulfillments fk_rails_eb398a7fa3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fulfillments
    ADD CONSTRAINT fk_rails_eb398a7fa3 FOREIGN KEY (sale_line_item_id, organization_id) REFERENCES public.sale_line_items(id, organization_id);


--
-- Name: benefit_grants fk_rails_f267f2cce5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benefit_grants
    ADD CONSTRAINT fk_rails_f267f2cce5 FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: check_ins fk_rails_f85f3a5a23; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT fk_rails_f85f3a5a23 FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id);


--
-- Name: sale_line_items fk_rails_fcf893f1f5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_line_items
    ADD CONSTRAINT fk_rails_fcf893f1f5 FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- PostgreSQL database dump complete
--

SET search_path TO "$user", public;

INSERT INTO "schema_migrations" (version) VALUES
('20261016000004'),
('20261016000003'),
('20261016000002'),
('20261016000001');

