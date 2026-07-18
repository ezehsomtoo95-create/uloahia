-- =============================================================================
-- 0027: Country-aware location hierarchy
-- Country → State/Province → City/LGA → Area
-- Safe additive migration. Rollback: drop tables/columns listed at bottom (manual).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_id, slug)
);

CREATE TABLE IF NOT EXISTS public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id uuid NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (state_id, slug)
);

CREATE TABLE IF NOT EXISTS public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_id, slug)
);

CREATE INDEX IF NOT EXISTS states_country_active_idx
  ON public.states (country_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS cities_state_active_idx
  ON public.cities (state_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS areas_city_active_idx
  ON public.areas (city_id, is_active, sort_order);

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS country_id uuid REFERENCES public.countries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS state_id uuid REFERENCES public.states(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS country text;

CREATE INDEX IF NOT EXISTS listings_country_id_idx
  ON public.listings (country_id);
CREATE INDEX IF NOT EXISTS listings_state_id_status_idx
  ON public.listings (state_id, status);
CREATE INDEX IF NOT EXISTS listings_city_id_status_idx
  ON public.listings (city_id, status);
CREATE INDEX IF NOT EXISTS listings_area_id_idx
  ON public.listings (area_id);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.countries, public.states, public.cities, public.areas TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.countries, public.states, public.cities, public.areas TO authenticated;

DROP POLICY IF EXISTS countries_public_select_active ON public.countries;
CREATE POLICY countries_public_select_active
  ON public.countries FOR SELECT
  USING (is_active = true OR public.is_phone_admin());

DROP POLICY IF EXISTS countries_admin_write ON public.countries;
CREATE POLICY countries_admin_write
  ON public.countries FOR ALL TO authenticated
  USING (public.is_phone_admin())
  WITH CHECK (public.is_phone_admin());

DROP POLICY IF EXISTS states_public_select_active ON public.states;
CREATE POLICY states_public_select_active
  ON public.states FOR SELECT
  USING (is_active = true OR public.is_phone_admin());

DROP POLICY IF EXISTS states_admin_write ON public.states;
CREATE POLICY states_admin_write
  ON public.states FOR ALL TO authenticated
  USING (public.is_phone_admin())
  WITH CHECK (public.is_phone_admin());

DROP POLICY IF EXISTS cities_public_select_active ON public.cities;
CREATE POLICY cities_public_select_active
  ON public.cities FOR SELECT
  USING (is_active = true OR public.is_phone_admin());

DROP POLICY IF EXISTS cities_admin_write ON public.cities;
CREATE POLICY cities_admin_write
  ON public.cities FOR ALL TO authenticated
  USING (public.is_phone_admin())
  WITH CHECK (public.is_phone_admin());

DROP POLICY IF EXISTS areas_public_select_active ON public.areas;
CREATE POLICY areas_public_select_active
  ON public.areas FOR SELECT
  USING (is_active = true OR public.is_phone_admin());

DROP POLICY IF EXISTS areas_admin_write ON public.areas;
CREATE POLICY areas_admin_write
  ON public.areas FOR ALL TO authenticated
  USING (public.is_phone_admin())
  WITH CHECK (public.is_phone_admin());

-- Helper: upsert a city under a state and ensure a 'central' / 'Central' area exists.
-- Must be defined before the seed DO $$ block that calls it.
CREATE OR REPLACE FUNCTION public._seed_simple_state_city(
  p_country_id uuid,
  p_state_slug text,
  p_city_slug text,
  p_city_name text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_state_id uuid;
  v_city_id uuid;
BEGIN
  SELECT id INTO v_state_id
  FROM public.states
  WHERE country_id = p_country_id
    AND slug = p_state_slug;

  IF v_state_id IS NULL THEN
    RAISE EXCEPTION 'state slug % not found for country %', p_state_slug, p_country_id;
  END IF;

  INSERT INTO public.cities (state_id, slug, name, sort_order)
  VALUES (v_state_id, p_city_slug, p_city_name, 1)
  ON CONFLICT (state_id, slug) DO UPDATE
    SET name = EXCLUDED.name,
        is_active = true
  RETURNING id INTO v_city_id;

  IF v_city_id IS NULL THEN
    SELECT id INTO v_city_id
    FROM public.cities
    WHERE state_id = v_state_id
      AND slug = p_city_slug;
  END IF;

  INSERT INTO public.areas (city_id, slug, name, sort_order)
  VALUES (v_city_id, 'central', 'Central', 1)
  ON CONFLICT (city_id, slug) DO UPDATE
    SET name = EXCLUDED.name,
        is_active = true;
END;
$$;

-- Seed Nigeria + 36 states + FCT + major cities/areas
INSERT INTO public.countries (code, name, is_active, sort_order)
VALUES ('NG', 'Nigeria', true, 1)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      sort_order = EXCLUDED.sort_order;

DO $$
DECLARE
  v_ng_id uuid;
  v_state_id uuid;
  v_city_id uuid;
BEGIN
  SELECT id INTO v_ng_id FROM public.countries WHERE code = 'NG';

  -- Seed all 36 states + FCT
  INSERT INTO public.states (country_id, slug, name, is_active, sort_order) VALUES
    (v_ng_id, 'abia', 'Abia', true, 1),
    (v_ng_id, 'adamawa', 'Adamawa', true, 2),
    (v_ng_id, 'akwa-ibom', 'Akwa Ibom', true, 3),
    (v_ng_id, 'anambra', 'Anambra', true, 4),
    (v_ng_id, 'bauchi', 'Bauchi', true, 5),
    (v_ng_id, 'bayelsa', 'Bayelsa', true, 6),
    (v_ng_id, 'benue', 'Benue', true, 7),
    (v_ng_id, 'borno', 'Borno', true, 8),
    (v_ng_id, 'cross-river', 'Cross River', true, 9),
    (v_ng_id, 'delta', 'Delta', true, 10),
    (v_ng_id, 'ebonyi', 'Ebonyi', true, 11),
    (v_ng_id, 'edo', 'Edo', true, 12),
    (v_ng_id, 'ekiti', 'Ekiti', true, 13),
    (v_ng_id, 'enugu', 'Enugu', true, 14),
    (v_ng_id, 'fct', 'FCT', true, 15),
    (v_ng_id, 'gombe', 'Gombe', true, 16),
    (v_ng_id, 'imo', 'Imo', true, 17),
    (v_ng_id, 'jigawa', 'Jigawa', true, 18),
    (v_ng_id, 'kaduna', 'Kaduna', true, 19),
    (v_ng_id, 'kano', 'Kano', true, 20),
    (v_ng_id, 'katsina', 'Katsina', true, 21),
    (v_ng_id, 'kebbi', 'Kebbi', true, 22),
    (v_ng_id, 'kogi', 'Kogi', true, 23),
    (v_ng_id, 'kwara', 'Kwara', true, 24),
    (v_ng_id, 'lagos', 'Lagos', true, 25),
    (v_ng_id, 'nasarawa', 'Nasarawa', true, 26),
    (v_ng_id, 'niger', 'Niger', true, 27),
    (v_ng_id, 'ogun', 'Ogun', true, 28),
    (v_ng_id, 'ondo', 'Ondo', true, 29),
    (v_ng_id, 'osun', 'Osun', true, 30),
    (v_ng_id, 'oyo', 'Oyo', true, 31),
    (v_ng_id, 'plateau', 'Plateau', true, 32),
    (v_ng_id, 'rivers', 'Rivers', true, 33),
    (v_ng_id, 'sokoto', 'Sokoto', true, 34),
    (v_ng_id, 'taraba', 'Taraba', true, 35),
    (v_ng_id, 'yobe', 'Yobe', true, 36),
    (v_ng_id, 'zamfara', 'Zamfara', true, 37)
  ON CONFLICT (country_id, slug) DO UPDATE
    SET name = EXCLUDED.name,
        is_active = true,
        sort_order = EXCLUDED.sort_order;

  -- Lagos
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'lagos';
  INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
    (v_state_id, 'ikeja', 'Ikeja', 1),
    (v_state_id, 'lekki', 'Lekki', 2),
    (v_state_id, 'yaba', 'Yaba', 3),
    (v_state_id, 'surulere', 'Surulere', 4),
    (v_state_id, 'victoria-island', 'Victoria Island', 5),
    (v_state_id, 'ikoyi', 'Ikoyi', 6),
    (v_state_id, 'ajah', 'Ajah', 7),
    (v_state_id, 'maryland', 'Maryland', 8)
  ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'ikeja';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'allen', 'Allen Avenue', 1),
    (v_city_id, 'alausa', 'Alausa', 2),
    (v_city_id, 'computer-village', 'Computer Village', 3),
    (v_city_id, 'ogba', 'Ogba', 4),
    (v_city_id, 'gra-ikeja', 'GRA', 5)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'lekki';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'lekki-phase-1', 'Lekki Phase 1', 1),
    (v_city_id, 'lekki-phase-2', 'Lekki Phase 2', 2),
    (v_city_id, 'chevron', 'Chevron', 3),
    (v_city_id, 'jakande', 'Jakande', 4)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'yaba';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'akoka', 'Akoka', 1),
    (v_city_id, 'sabo', 'Sabo', 2),
    (v_city_id, 'onike', 'Onike', 3)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'surulere';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'aguda', 'Aguda', 1),
    (v_city_id, 'bode-thomas', 'Bode Thomas', 2),
    (v_city_id, 'national-stadium', 'National Stadium', 3)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'victoria-island';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'central', 'Central', 1)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'ikoyi';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'central', 'Central', 1)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'ajah';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'central', 'Central', 1)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'maryland';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'central', 'Central', 1)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  -- FCT / Abuja
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'fct';
  INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
    (v_state_id, 'abuja', 'Abuja', 1),
    (v_state_id, 'gwagwalada', 'Gwagwalada', 2),
    (v_state_id, 'kubwa', 'Kubwa', 3)
  ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'abuja';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'wuse', 'Wuse', 1),
    (v_city_id, 'garki', 'Garki', 2),
    (v_city_id, 'maitama', 'Maitama', 3),
    (v_city_id, 'asokoro', 'Asokoro', 4),
    (v_city_id, 'gwarinpa', 'Gwarinpa', 5),
    (v_city_id, 'jabi', 'Jabi', 6),
    (v_city_id, 'utako', 'Utako', 7)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'gwagwalada';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'central', 'Central', 1)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'kubwa';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'central', 'Central', 1)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  -- Rivers
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'rivers';
  INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
    (v_state_id, 'port-harcourt', 'Port Harcourt', 1),
    (v_state_id, 'obio-akpor', 'Obio-Akpor', 2)
  ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'port-harcourt';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'gra-ph', 'GRA', 1),
    (v_city_id, 'trans-amadi', 'Trans Amadi', 2),
    (v_city_id, 'rumuola', 'Rumuola', 3),
    (v_city_id, 'diobu', 'Diobu', 4)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'obio-akpor';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'central', 'Central', 1)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  -- Kano
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'kano';
  INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
    (v_state_id, 'kano', 'Kano', 1)
  ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'kano';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'nassarawa', 'Nassarawa', 1),
    (v_city_id, 'sabon-gari', 'Sabon Gari', 2),
    (v_city_id, 'tarauni', 'Tarauni', 3),
    (v_city_id, 'gwale', 'Gwale', 4)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  -- Kaduna
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'kaduna';
  INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
    (v_state_id, 'kaduna', 'Kaduna', 1),
    (v_state_id, 'zaria', 'Zaria', 2)
  ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'kaduna';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'barnawa', 'Barnawa', 1),
    (v_city_id, 'sabon-tasha', 'Sabon Tasha', 2),
    (v_city_id, 'ungwan-rimi', 'Ungwan Rimi', 3)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'zaria';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'central', 'Central', 1)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  -- Oyo
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'oyo';
  INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
    (v_state_id, 'ibadan', 'Ibadan', 1),
    (v_state_id, 'ogbomoso', 'Ogbomoso', 2)
  ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'ibadan';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'bodija', 'Bodija', 1),
    (v_city_id, 'ring-road', 'Ring Road', 2),
    (v_city_id, 'ui', 'UI', 3),
    (v_city_id, 'challenge', 'Challenge', 4),
    (v_city_id, 'dugbe', 'Dugbe', 5)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'ogbomoso';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'central', 'Central', 1)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  -- Anambra (full existing Eastern depth)
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'anambra';
  INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
    (v_state_id, 'onitsha', 'Onitsha', 1),
    (v_state_id, 'awka', 'Awka', 2),
    (v_state_id, 'nnewi', 'Nnewi', 3),
    (v_state_id, 'ekwulobia', 'Ekwulobia', 4)
  ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'onitsha';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'fegge', 'Fegge', 1),
    (v_city_id, 'gra', 'GRA', 2),
    (v_city_id, 'inland-town', 'Inland Town', 3),
    (v_city_id, 'nkpor', 'Nkpor', 4),
    (v_city_id, 'omagba', 'Omagba', 5),
    (v_city_id, 'woliwo', 'Woliwo', 6)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'awka';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'aroma', 'Aroma', 1),
    (v_city_id, 'ifite', 'Ifite', 2),
    (v_city_id, 'okpuno', 'Okpuno', 3),
    (v_city_id, 'temp-site', 'Temp Site', 4),
    (v_city_id, 'unizik-junction', 'Unizik Junction', 5)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'nnewi';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'akudo', 'Akudo', 1),
    (v_city_id, 'nnewi-central', 'Nnewi Central', 2),
    (v_city_id, 'otolo', 'Otolo', 3),
    (v_city_id, 'uruagu', 'Uruagu', 4),
    (v_city_id, 'umudim', 'Umudim', 5)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'ekwulobia';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'ekwulobia-central', 'Ekwulobia Central', 1),
    (v_city_id, 'umuchiana', 'Umuchiana', 2),
    (v_city_id, 'aguata', 'Aguata', 3)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  -- Enugu
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'enugu';
  INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
    (v_state_id, 'enugu', 'Enugu', 1)
  ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'enugu';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'abakpa', 'Abakpa', 1),
    (v_city_id, 'gra-enugu', 'GRA', 2),
    (v_city_id, 'independence-layout', 'Independence Layout', 3),
    (v_city_id, 'new-haven', 'New Haven', 4),
    (v_city_id, 'trans-ekulu', 'Trans-Ekulu', 5),
    (v_city_id, 'uwani', 'Uwani', 6)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  -- Imo
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'imo';
  INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
    (v_state_id, 'owerri', 'Owerri', 1)
  ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'owerri';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'aladinma', 'Aladinma', 1),
    (v_city_id, 'ikenegbu', 'Ikenegbu', 2),
    (v_city_id, 'new-owerri', 'New Owerri', 3),
    (v_city_id, 'orji', 'Orji', 4),
    (v_city_id, 'world-bank', 'World Bank', 5)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  -- Abia
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'abia';
  INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
    (v_state_id, 'aba', 'Aba', 1),
    (v_state_id, 'umuahia', 'Umuahia', 2)
  ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'aba';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'ariaria', 'Ariaria', 1),
    (v_city_id, 'ogbor-hill', 'Ogbor Hill', 2),
    (v_city_id, 'osisioma', 'Osisioma', 3),
    (v_city_id, 'umuungasi', 'Umuungasi', 4),
    (v_city_id, 'world-bank-aba', 'World Bank', 5)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'umuahia';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'afara', 'Afara', 1),
    (v_city_id, 'low-cost', 'Low Cost', 2),
    (v_city_id, 'mission-hill', 'Mission Hill', 3),
    (v_city_id, 'umuahia-central', 'Umuahia Central', 4),
    (v_city_id, 'world-bank-umuahia', 'World Bank', 5)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  -- Ebonyi
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'ebonyi';
  INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
    (v_state_id, 'abakaliki', 'Abakaliki', 1)
  ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'abakaliki';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'azuiyiokwu', 'Azuiyiokwu', 1),
    (v_city_id, 'cas-campus', 'CAS Campus', 2),
    (v_city_id, 'kpirikpiri', 'Kpirikpiri', 3),
    (v_city_id, 'presco', 'Presco', 4),
    (v_city_id, 'water-works', 'Water Works', 5)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  -- Remaining states: one major city + Central area each
  PERFORM public._seed_simple_state_city(v_ng_id, 'adamawa', 'yola', 'Yola');
  PERFORM public._seed_simple_state_city(v_ng_id, 'akwa-ibom', 'uyo', 'Uyo');
  PERFORM public._seed_simple_state_city(v_ng_id, 'bauchi', 'bauchi', 'Bauchi');
  PERFORM public._seed_simple_state_city(v_ng_id, 'bayelsa', 'yenagoa', 'Yenagoa');
  PERFORM public._seed_simple_state_city(v_ng_id, 'benue', 'makurdi', 'Makurdi');
  PERFORM public._seed_simple_state_city(v_ng_id, 'borno', 'maiduguri', 'Maiduguri');
  PERFORM public._seed_simple_state_city(v_ng_id, 'cross-river', 'calabar', 'Calabar');
  PERFORM public._seed_simple_state_city(v_ng_id, 'delta', 'asaba', 'Asaba');
  PERFORM public._seed_simple_state_city(v_ng_id, 'edo', 'benin-city', 'Benin City');
  PERFORM public._seed_simple_state_city(v_ng_id, 'ekiti', 'ado-ekiti', 'Ado Ekiti');
  PERFORM public._seed_simple_state_city(v_ng_id, 'gombe', 'gombe', 'Gombe');
  PERFORM public._seed_simple_state_city(v_ng_id, 'jigawa', 'dutse', 'Dutse');
  PERFORM public._seed_simple_state_city(v_ng_id, 'katsina', 'katsina', 'Katsina');
  PERFORM public._seed_simple_state_city(v_ng_id, 'kebbi', 'birnin-kebbi', 'Birnin Kebbi');
  PERFORM public._seed_simple_state_city(v_ng_id, 'kogi', 'lokoja', 'Lokoja');
  PERFORM public._seed_simple_state_city(v_ng_id, 'kwara', 'ilorin', 'Ilorin');
  PERFORM public._seed_simple_state_city(v_ng_id, 'nasarawa', 'lafia', 'Lafia');
  PERFORM public._seed_simple_state_city(v_ng_id, 'niger', 'minna', 'Minna');
  PERFORM public._seed_simple_state_city(v_ng_id, 'ogun', 'abeokuta', 'Abeokuta');
  PERFORM public._seed_simple_state_city(v_ng_id, 'ondo', 'akure', 'Akure');
  PERFORM public._seed_simple_state_city(v_ng_id, 'osun', 'osogbo', 'Osogbo');
  PERFORM public._seed_simple_state_city(v_ng_id, 'plateau', 'jos', 'Jos');
  PERFORM public._seed_simple_state_city(v_ng_id, 'sokoto', 'sokoto', 'Sokoto');
  PERFORM public._seed_simple_state_city(v_ng_id, 'taraba', 'jalingo', 'Jalingo');
  PERFORM public._seed_simple_state_city(v_ng_id, 'yobe', 'damaturu', 'Damaturu');
  PERFORM public._seed_simple_state_city(v_ng_id, 'zamfara', 'gusau', 'Gusau');

  -- Extra Delta / Ogun hubs
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'delta';
  INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
    (v_state_id, 'warri', 'Warri', 2)
  ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name;
  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'warri';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'central', 'Central', 1),
    (v_city_id, 'effurun', 'Effurun', 2)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'ogun';
  INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
    (v_state_id, 'sango-ota', 'Sango-Ota', 2)
  ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name;
  SELECT id INTO v_city_id FROM public.cities WHERE state_id = v_state_id AND slug = 'sango-ota';
  INSERT INTO public.areas (city_id, slug, name, sort_order) VALUES
    (v_city_id, 'central', 'Central', 1)
  ON CONFLICT (city_id, slug) DO UPDATE SET name = EXCLUDED.name;

  -- Backfill listing location FKs from existing text
  UPDATE public.listings l
  SET country_id = v_ng_id,
      country = 'Nigeria'
  WHERE l.country_id IS NULL;

  UPDATE public.listings l
  SET state_id = s.id
  FROM public.states s
  WHERE l.state_id IS NULL
    AND s.country_id = v_ng_id
    AND lower(s.name) = lower(l.state);

  UPDATE public.listings l
  SET city_id = c.id
  FROM public.cities c
  WHERE l.city_id IS NULL
    AND l.state_id IS NOT NULL
    AND c.state_id = l.state_id
    AND lower(c.name) = lower(l.city);

  UPDATE public.listings l
  SET area_id = a.id
  FROM public.areas a
  WHERE l.area_id IS NULL
    AND l.city_id IS NOT NULL
    AND a.city_id = l.city_id
    AND lower(a.name) = lower(l.area);
END $$;

-- Rollback notes (manual):
-- ALTER TABLE public.listings DROP COLUMN IF EXISTS country_id;
-- ALTER TABLE public.listings DROP COLUMN IF EXISTS state_id;
-- ALTER TABLE public.listings DROP COLUMN IF EXISTS city_id;
-- ALTER TABLE public.listings DROP COLUMN IF EXISTS area_id;
-- ALTER TABLE public.listings DROP COLUMN IF EXISTS country;
-- DROP FUNCTION IF EXISTS public._seed_simple_state_city(uuid, text, text, text);
-- DROP TABLE IF EXISTS public.areas CASCADE;
-- DROP TABLE IF EXISTS public.cities CASCADE;
-- DROP TABLE IF EXISTS public.states CASCADE;
-- DROP TABLE IF EXISTS public.countries CASCADE;
