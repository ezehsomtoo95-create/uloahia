-- Hybrid location expansion: full LGA/city coverage for high-traffic states
-- + key hubs for other states. Additive / idempotent via ON CONFLICT.

DO $$
DECLARE
  v_ng_id uuid;
  v_state_id uuid;
  v_city_id uuid;
BEGIN
  SELECT id INTO v_ng_id FROM public.countries WHERE code = 'NG' LIMIT 1;
  IF v_ng_id IS NULL THEN
    RAISE NOTICE 'NG country missing; skip 0037 location expand';
    RETURN;
  END IF;

  -- ========== LAGOS (LGAs / major districts as cities) ==========
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'lagos';
  IF v_state_id IS NOT NULL THEN
    INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
      (v_state_id, 'agege', 'Agege', 20),
      (v_state_id, 'ajeromi-ifelodun', 'Ajeromi-Ifelodun', 21),
      (v_state_id, 'alimosho', 'Alimosho', 22),
      (v_state_id, 'amuwo-odofin', 'Amuwo-Odofin', 23),
      (v_state_id, 'apapa', 'Apapa', 24),
      (v_state_id, 'badagry', 'Badagry', 25),
      (v_state_id, 'epe', 'Epe', 26),
      (v_state_id, 'eti-osa', 'Eti-Osa', 27),
      (v_state_id, 'ibeju-lekki', 'Ibeju-Lekki', 28),
      (v_state_id, 'ifako-ijaiye', 'Ifako-Ijaiye', 29),
      (v_state_id, 'ikeja-lga', 'Ikeja LGA', 30),
      (v_state_id, 'kosofe', 'Kosofe', 31),
      (v_state_id, 'lagos-island', 'Lagos Island', 32),
      (v_state_id, 'lagos-mainland', 'Lagos Mainland', 33),
      (v_state_id, 'mushin', 'Mushin', 34),
      (v_state_id, 'ojo', 'Ojo', 35),
      (v_state_id, 'oshodi-isolo', 'Oshodi-Isolo', 36),
      (v_state_id, 'shomolu', 'Shomolu', 37)
    ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name, is_active = true;

    -- Seed Central area for any Lagos city missing areas
    FOR v_city_id IN
      SELECT c.id FROM public.cities c
      WHERE c.state_id = v_state_id
        AND NOT EXISTS (SELECT 1 FROM public.areas a WHERE a.city_id = c.id)
    LOOP
      INSERT INTO public.areas (city_id, slug, name, sort_order)
      VALUES (v_city_id, 'central', 'Central', 1)
      ON CONFLICT (city_id, slug) DO NOTHING;
    END LOOP;
  END IF;

  -- ========== FCT / ABUJA ==========
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'fct';
  IF v_state_id IS NOT NULL THEN
    INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
      (v_state_id, 'abaji', 'Abaji', 20),
      (v_state_id, 'bwari', 'Bwari', 21),
      (v_state_id, 'gwagwalada', 'Gwagwalada', 22),
      (v_state_id, 'kuje', 'Kuje', 23),
      (v_state_id, 'kwali', 'Kwali', 24),
      (v_state_id, 'municipal', 'Municipal Area Council', 25),
      (v_state_id, 'wuse', 'Wuse', 26),
      (v_state_id, 'garki', 'Garki', 27),
      (v_state_id, 'maitama', 'Maitama', 28),
      (v_state_id, 'asokoro', 'Asokoro', 29),
      (v_state_id, 'kubwa', 'Kubwa', 30),
      (v_state_id, 'lugbe', 'Lugbe', 31)
    ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name, is_active = true;

    FOR v_city_id IN
      SELECT c.id FROM public.cities c
      WHERE c.state_id = v_state_id
        AND NOT EXISTS (SELECT 1 FROM public.areas a WHERE a.city_id = c.id)
    LOOP
      INSERT INTO public.areas (city_id, slug, name, sort_order)
      VALUES (v_city_id, 'central', 'Central', 1)
      ON CONFLICT (city_id, slug) DO NOTHING;
    END LOOP;
  END IF;

  -- ========== RIVERS ==========
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'rivers';
  IF v_state_id IS NOT NULL THEN
    INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
      (v_state_id, 'port-harcourt', 'Port Harcourt', 1),
      (v_state_id, 'obio-akpor', 'Obio-Akpor', 2),
      (v_state_id, 'eleme', 'Eleme', 3),
      (v_state_id, 'okrika', 'Okrika', 4),
      (v_state_id, 'oyigbo', 'Oyigbo', 5),
      (v_state_id, 'ikwerre', 'Ikwerre', 6),
      (v_state_id, 'etche', 'Etche', 7),
      (v_state_id, 'bonny', 'Bonny', 8),
      (v_state_id, 'degema', 'Degema', 9),
      (v_state_id, 'asari-toru', 'Asari-Toru', 10),
      (v_state_id, 'akuku-toru', 'Akuku-Toru', 11),
      (v_state_id, 'ogba-egbema-ndoni', 'Ogba/Egbema/Ndoni', 12),
      (v_state_id, 'ahoda-east', 'Ahoada East', 13),
      (v_state_id, 'ahoda-west', 'Ahoada West', 14),
      (v_state_id, 'gokana', 'Gokana', 15),
      (v_state_id, 'khana', 'Khana', 16),
      (v_state_id, 'tai', 'Tai', 17),
      (v_state_id, 'omuama', 'Omuma', 18),
      (v_state_id, 'andumini-ogoni', 'Andoni', 19),
      (v_state_id, 'opobo-nkoro', 'Opobo/Nkoro', 20),
      (v_state_id, 'emohua', 'Emohua', 21),
      (v_state_id, 'ikwerre-isiokpo', 'Isiokpo', 22)
    ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name, is_active = true;

    FOR v_city_id IN
      SELECT c.id FROM public.cities c
      WHERE c.state_id = v_state_id
        AND NOT EXISTS (SELECT 1 FROM public.areas a WHERE a.city_id = c.id)
    LOOP
      INSERT INTO public.areas (city_id, slug, name, sort_order)
      VALUES (v_city_id, 'central', 'Central', 1)
      ON CONFLICT (city_id, slug) DO NOTHING;
    END LOOP;
  END IF;

  -- ========== KANO ==========
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'kano';
  IF v_state_id IS NOT NULL THEN
    INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
      (v_state_id, 'kano-municipal', 'Kano Municipal', 1),
      (v_state_id, 'nassarawa', 'Nassarawa', 2),
      (v_state_id, 'dala', 'Dala', 3),
      (v_state_id, 'gwale', 'Gwale', 4),
      (v_state_id, 'tarauni', 'Tarauni', 5),
      (v_state_id, 'fagge', 'Fagge', 6),
      (v_state_id, 'ungogo', 'Ungogo', 7),
      (v_state_id, 'kumbotso', 'Kumbotso', 8),
      (v_state_id, 'dawakin-kudu', 'Dawakin Kudu', 9),
      (v_state_id, 'dawakin-tofa', 'Dawakin Tofa', 10),
      (v_state_id, 'geawa', 'Gezawa', 11),
      (v_state_id, 'wara', 'Wudil', 12),
      (v_state_id, 'gari', 'Garko', 13),
      (v_state_id, 'bichi', 'Bichi', 14),
      (v_state_id, 'rano', 'Rano', 15),
      (v_state_id, 'sumaila', 'Sumaila', 16),
      (v_state_id, 'karaye', 'Karaye', 17),
      (v_state_id, 'rimin-gado', 'Rimin Gado', 18),
      (v_state_id, 'kura', 'Kura', 19),
      (v_state_id, 'madobi', 'Madobi', 20)
    ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name, is_active = true;

    FOR v_city_id IN
      SELECT c.id FROM public.cities c
      WHERE c.state_id = v_state_id
        AND NOT EXISTS (SELECT 1 FROM public.areas a WHERE a.city_id = c.id)
    LOOP
      INSERT INTO public.areas (city_id, slug, name, sort_order)
      VALUES (v_city_id, 'central', 'Central', 1)
      ON CONFLICT (city_id, slug) DO NOTHING;
    END LOOP;
  END IF;

  -- ========== ANAMBRA ==========
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'anambra';
  IF v_state_id IS NOT NULL THEN
    INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
      (v_state_id, 'awka-north', 'Awka North', 10),
      (v_state_id, 'awka-south', 'Awka South', 11),
      (v_state_id, 'onitsha-north', 'Onitsha North', 12),
      (v_state_id, 'onitsha-south', 'Onitsha South', 13),
      (v_state_id, 'idemili-north', 'Idemili North', 14),
      (v_state_id, 'idemili-south', 'Idemili South', 15),
      (v_state_id, 'nnewi-north', 'Nnewi North', 16),
      (v_state_id, 'nnewi-south', 'Nnewi South', 17),
      (v_state_id, 'aguata', 'Aguata', 18),
      (v_state_id, 'anaocha', 'Anaocha', 19),
      (v_state_id, 'dunukofia', 'Dunukofia', 20),
      (v_state_id, 'njikoka', 'Njikoka', 21),
      (v_state_id, 'orumba-north', 'Orumba North', 22),
      (v_state_id, 'orumba-south', 'Orumba South', 23),
      (v_state_id, 'ogbaru', 'Ogbaru', 24),
      (v_state_id, 'ihiala', 'Ihiala', 25),
      (v_state_id, 'ayi-melum', 'Ayamelum', 26),
      (v_state_id, 'anambra-east', 'Anambra East', 27),
      (v_state_id, 'anambra-west', 'Anambra West', 28),
      (v_state_id, 'oyi', 'Oyi', 29),
      (v_state_id, 'ekwusigo', 'Ekwusigo', 30)
    ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name, is_active = true;

    FOR v_city_id IN
      SELECT c.id FROM public.cities c
      WHERE c.state_id = v_state_id
        AND NOT EXISTS (SELECT 1 FROM public.areas a WHERE a.city_id = c.id)
    LOOP
      INSERT INTO public.areas (city_id, slug, name, sort_order)
      VALUES (v_city_id, 'central', 'Central', 1)
      ON CONFLICT (city_id, slug) DO NOTHING;
    END LOOP;
  END IF;

  -- ========== KEY HUBS for other states ==========
  -- Ogun
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'ogun';
  IF v_state_id IS NOT NULL THEN
    INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
      (v_state_id, 'abeokuta', 'Abeokuta', 1),
      (v_state_id, 'sango-ota', 'Sango-Ota', 2),
      (v_state_id, 'ijebu-ode', 'Ijebu-Ode', 3),
      (v_state_id, 'sagamu', 'Sagamu', 4),
      (v_state_id, 'ifo', 'Ifo', 5),
      (v_state_id, 'agbara', 'Agbara', 6)
    ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name, is_active = true;
  END IF;

  -- Delta
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'delta';
  IF v_state_id IS NOT NULL THEN
    INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
      (v_state_id, 'asaba', 'Asaba', 1),
      (v_state_id, 'warri', 'Warri', 2),
      (v_state_id, 'ughelli', 'Ughelli', 3),
      (v_state_id, 'sapele', 'Sapele', 4),
      (v_state_id, 'abraka', 'Abraka', 5)
    ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name, is_active = true;
  END IF;

  -- Edo
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'edo';
  IF v_state_id IS NOT NULL THEN
    INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
      (v_state_id, 'benin-city', 'Benin City', 1),
      (v_state_id, 'auchii', 'Auchi', 2),
      (v_state_id, 'ekpoma', 'Ekpoma', 3),
      (v_state_id, 'ugbowo', 'Ugbowo', 4)
    ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name, is_active = true;
  END IF;

  -- Oyo
  SELECT id INTO v_state_id FROM public.states WHERE country_id = v_ng_id AND slug = 'oyo';
  IF v_state_id IS NOT NULL THEN
    INSERT INTO public.cities (state_id, slug, name, sort_order) VALUES
      (v_state_id, 'ibadan', 'Ibadan', 1),
      (v_state_id, 'ogbomoso', 'Ogbomoso', 2),
      (v_state_id, 'oyo-town', 'Oyo', 3),
      (v_state_id, 'isehin', 'Iseyin', 4),
      (v_state_id, 'saki', 'Saki', 5)
    ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name, is_active = true;
  END IF;

  -- Ensure every city has at least one area
  INSERT INTO public.areas (city_id, slug, name, sort_order)
  SELECT c.id, 'central', 'Central', 1
  FROM public.cities c
  JOIN public.states s ON s.id = c.state_id
  WHERE s.country_id = v_ng_id
    AND NOT EXISTS (SELECT 1 FROM public.areas a WHERE a.city_id = c.id)
  ON CONFLICT (city_id, slug) DO NOTHING;
END $$;
