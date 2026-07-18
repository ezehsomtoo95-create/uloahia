import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Area, City, Country, LocationTreeState, State } from "@/lib/types";

type CountryRow = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

type StateRow = {
  id: string;
  country_id: string;
  slug: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

type CityRow = {
  id: string;
  state_id: string;
  slug: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

type AreaRow = {
  id: string;
  city_id: string;
  slug: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

function mapCountry(row: CountryRow): Country {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

function mapState(row: StateRow): State {
  return {
    id: row.id,
    countryId: row.country_id,
    slug: row.slug,
    name: row.name,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

function mapCity(row: CityRow): City {
  return {
    id: row.id,
    stateId: row.state_id,
    slug: row.slug,
    name: row.name,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

function mapArea(row: AreaRow): Area {
  return {
    id: row.id,
    cityId: row.city_id,
    slug: row.slug,
    name: row.name,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export async function getActiveCountry() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("countries")
    .select("id, code, name, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.error("[locations] getActiveCountry failed", error);
    return null;
  }

  return mapCountry(data as CountryRow);
}

export async function getActiveLocationTree(): Promise<LocationTreeState[]> {
  const country = await getActiveCountry();
  if (!country) {
    return [];
  }

  const supabase = await createClient();
  const [{ data: states }, { data: cities }, { data: areas }] = await Promise.all([
    supabase
      .from("states")
      .select("id, country_id, slug, name, is_active, sort_order")
      .eq("country_id", country.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("cities")
      .select("id, state_id, slug, name, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("areas")
      .select("id, city_id, slug, name, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  const stateRows = (states ?? []) as StateRow[];
  const cityRows = (cities ?? []) as CityRow[];
  const areaRows = (areas ?? []) as AreaRow[];

  const areasByCity = new Map<string, Area[]>();
  for (const area of areaRows) {
    const list = areasByCity.get(area.city_id) ?? [];
    list.push(mapArea(area));
    areasByCity.set(area.city_id, list);
  }

  const citiesByState = new Map<string, Array<City & { areas: Area[] }>>();
  for (const city of cityRows) {
    const list = citiesByState.get(city.state_id) ?? [];
    list.push({ ...mapCity(city), areas: areasByCity.get(city.id) ?? [] });
    citiesByState.set(city.state_id, list);
  }

  return stateRows.map((state) => ({
    ...mapState(state),
    cities: citiesByState.get(state.id) ?? [],
  }));
}

export async function getDefaultSellLocation() {
  const tree = await getActiveLocationTree();
  const lagos = tree.find((state) => state.slug === "lagos") ?? tree[0];
  const city = lagos?.cities.find((entry) => entry.slug === "ikeja") ?? lagos?.cities[0];
  const area = city?.areas[0];

  if (!lagos || !city || !area) {
    return null;
  }

  return {
    countryId: lagos.countryId,
    country: "Nigeria",
    stateId: lagos.id,
    state: lagos.name,
    cityId: city.id,
    city: city.name,
    areaId: area.id,
    area: area.name,
  };
}
