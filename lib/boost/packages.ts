import "server-only";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";

/**
 * Boost packages are the single source of truth for pricing and duration.
 * The client only ever sends a package id — amount/duration are recomputed from
 * the database server-side so a tampered price payload can never be trusted.
 */

export type BoostPackage = {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  priceNgn: number;
  currency: string;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
};

type BoostPackageRow = {
  id: string;
  name: string;
  description: string | null;
  duration_days: number;
  price_ngn: number;
  currency: string;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
};

export function mapBoostPackage(row: BoostPackageRow): BoostPackage {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    durationDays: row.duration_days,
    priceNgn: row.price_ngn,
    currency: row.currency,
    isActive: row.is_active,
    isPopular: row.is_popular,
    sortOrder: row.sort_order,
  };
}

const PACKAGE_SELECT = `
  id,
  name,
  description,
  duration_days,
  price_ngn,
  currency,
  is_active,
  is_popular,
  sort_order
`;

/** Active packages ordered how they should be displayed (ascending price). */
export async function getActiveBoostPackages(): Promise<BoostPackage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boost_packages")
    .select(PACKAGE_SELECT)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("price_ngn", { ascending: true });

  if (error || !data) {
    console.error("[boost] getActiveBoostPackages failed", {
      code: error?.code,
      message: error?.message,
    });
    return [];
  }

  return (data as BoostPackageRow[]).map(mapBoostPackage);
}

/** Resolve a package server-side (bypasses RLS) for authority on price. */
export async function getActiveBoostPackageById(id: string): Promise<BoostPackage | null> {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("boost_packages")
    .select(PACKAGE_SELECT)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapBoostPackage(data as BoostPackageRow);
}