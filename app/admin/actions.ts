"use server";

import { revalidatePath } from "next/cache";
import { assertIsAdmin, requireAdmin } from "@/lib/admin/auth";
import {
  adminError,
  adminSuccess,
  type AdminActionResult,
} from "@/lib/admin/results";
import {
  getAdminListingDetail,
  getAdminReportDetail,
  getAdminUserDetail,
} from "@/lib/data/admin-detail";
import type { AdminListingDetail, AdminReportDetail, AdminUserDetail } from "@/lib/data/admin-detail";
import { getAdminTableData } from "@/lib/data/admin-listings";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";

function revalidateAdminPaths(listingId?: string) {
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath("/my-listings");

  if (listingId) {
    revalidatePath(`/listing/${listingId}`);
  }
}

async function assertAdminCanMutate() {
  const userSupabase = await createClient();
  const isAdmin = await assertIsAdmin(userSupabase);

  if (!isAdmin) {
    throw new Error("Not authorized for admin mutations.");
  }
}

async function deleteListingRecord(listingId: string) {
  const { profile } = await requireAdmin();
  await assertAdminCanMutate();

  const admin = supabaseAdmin();

  const { error: imageError } = await admin
    .from("listing_images")
    .delete()
    .eq("listing_id", listingId);

  if (imageError) {
    throw new Error(imageError.message);
  }

  const { error } = await admin.from("listings").delete().eq("id", listingId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchAdminListingDetail(
  listingId: string,
): Promise<AdminListingDetail | null> {
  console.log("fetchAdminListingDetail called with id:", listingId);
  const { supabase } = await requireAdmin();
  const detail = await getAdminListingDetail(supabase, listingId);
  console.log("fetchAdminListingDetail result:", detail ? "found" : "not found", listingId);
  return detail;
}

export async function fetchAdminUserDetail(
  userId: string,
): Promise<AdminUserDetail | null> {
  const { supabase } = await requireAdmin();
  return getAdminUserDetail(supabase, userId);
}

export async function fetchAdminReportDetail(
  reportId: string,
): Promise<AdminReportDetail | null> {
  const { supabase } = await requireAdmin();
  return getAdminReportDetail(supabase, reportId);
}

export type ListingStatusUpdate = "approved" | "rejected" | "pending" | "sold";

export async function updateListingStatus(
  listingId: string,
  newStatus: ListingStatusUpdate,
  options?: { rejectionReason?: string | null },
): Promise<AdminActionResult> {
  const trimmedListingId = listingId?.trim();

  if (!trimmedListingId) {
    return adminError("Listing ID is required.");
  }

  console.log("[admin] updateListingStatus", {
    listingId: trimmedListingId,
    newStatus,
  });

  const { user, profile } = await requireAdmin();

  try {
    await assertAdminCanMutate();
  } catch {
    return adminError("Not authorized to update listings.");
  }

  const payload: {
    status: ListingStatusUpdate;
    rejection_reason?: string | null;
    reviewed_at?: string | null;
    reviewed_by?: string | null;
  } = { status: newStatus };

  if (newStatus === "approved") {
    payload.rejection_reason = null;
    payload.reviewed_at = new Date().toISOString();
    payload.reviewed_by = user.id;
  } else if (newStatus === "rejected") {
    const trimmedReason = options?.rejectionReason?.trim() ?? "";
    if (!trimmedReason) {
      return adminError("Rejection reason is required.");
    }
    payload.rejection_reason = trimmedReason;
    payload.reviewed_at = new Date().toISOString();
    payload.reviewed_by = user.id;
  } else if (newStatus === "pending") {
    payload.rejection_reason = null;
    payload.reviewed_at = null;
    payload.reviewed_by = null;
  }

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("listings")
    .update(payload)
    .eq("id", trimmedListingId)
    .select("id, status")
    .maybeSingle();

  console.log("[admin] updateListingStatus result", {
    listingId: trimmedListingId,
    data,
    error: error?.message ?? null,
    code: error?.code ?? null,
  });

  if (error) {
    return adminError(error.message);
  }

  if (!data) {
    return adminError("Listing not found.");
  }

  revalidateAdminPaths(trimmedListingId);
  return adminSuccess();
}

export async function approveListingById(listingId: string): Promise<AdminActionResult> {
  return updateListingStatus(listingId, "approved");
}

export async function rejectListingById(
  listingId: string,
  reason: string,
): Promise<AdminActionResult> {
  return updateListingStatus(listingId, "rejected", { rejectionReason: reason });
}

export async function deleteListingById(listingId: string): Promise<AdminActionResult> {
  try {
    await deleteListingRecord(listingId);
    revalidateAdminPaths(listingId);
    return adminSuccess();
  } catch (error) {
    return adminError(error instanceof Error ? error.message : "Could not delete listing.");
  }
}

export async function markListingSoldById(listingId: string): Promise<AdminActionResult> {
  return updateListingStatus(listingId, "sold");
}

export async function moveListingToPending(listingId: string): Promise<AdminActionResult> {
  return updateListingStatus(listingId, "pending");
}

export async function reopenListingById(listingId: string): Promise<AdminActionResult> {
  return updateListingStatus(listingId, "approved");
}

export async function toggleFeatureListingById(
  listingId: string,
): Promise<AdminActionResult & { isFeatured?: boolean }> {
  const { profile } = await requireAdmin();

  try {
    await assertAdminCanMutate();
  } catch {
    return adminError("Not authorized to update listings.");
  }

  const admin = supabaseAdmin();

  const { data: listing, error: fetchError } = await admin
    .from("listings")
    .select("is_featured")
    .eq("id", listingId)
    .maybeSingle();

  if (fetchError || !listing) {
    return adminError(fetchError?.message ?? "Listing not found.");
  }

  const nextFeatured = !listing.is_featured;

  const { error } = await admin
    .from("listings")
    .update({ is_featured: nextFeatured })
    .eq("id", listingId);

  if (error) {
    return adminError(error.message);
  }

  revalidateAdminPaths(listingId);
  return { success: true, isFeatured: nextFeatured };
}

export async function adminUpdateListing(input: {
  listingId: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  state: string;
  city: string;
  area: string;
}): Promise<AdminActionResult> {
  const { profile } = await requireAdmin();

  try {
    await assertAdminCanMutate();
  } catch {
    return adminError("Not authorized to update listings.");
  }

  const { error } = await supabaseAdmin()
    .from("listings")
    .update({
      title: input.title.trim(),
      description: input.description.trim(),
      price: input.price,
      category: input.category,
      condition: input.condition,
      state: input.state,
      city: input.city,
      area: input.area,
    })
    .eq("id", input.listingId);

  if (error) {
    return adminError(error.message);
  }

  revalidateAdminPaths(input.listingId);
  return adminSuccess();
}

export async function suspendUserById(userId: string): Promise<AdminActionResult> {
  const { user, profile } = await requireAdmin();

  if (userId === user.id) {
    return adminError("You cannot suspend your own account.");
  }

  try {
    await assertAdminCanMutate();
  } catch {
    return adminError("Not authorized to update users.");
  }

  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({ account_status: "suspended" })
    .eq("id", userId);

  if (error) {
    return adminError(error.message);
  }

  revalidateAdminPaths();
  return adminSuccess();
}

export async function activateUserById(userId: string): Promise<AdminActionResult> {
  const { profile } = await requireAdmin();

  try {
    await assertAdminCanMutate();
  } catch {
    return adminError("Not authorized to update users.");
  }

  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({ account_status: "active" })
    .eq("id", userId);

  if (error) {
    return adminError(error.message);
  }

  revalidateAdminPaths();
  return adminSuccess();
}

export async function deleteUserById(userId: string): Promise<AdminActionResult> {
  const { user, profile } = await requireAdmin();

  if (userId === user.id) {
    return adminError("You cannot delete your own account.");
  }

  try {
    await assertAdminCanMutate();
    const admin = supabaseAdmin();
    const { error: authError } = await admin.auth.admin.deleteUser(userId);

    if (authError) {
      const { error: profileError } = await admin
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileError) {
        return adminError(authError.message);
      }
    }

    revalidateAdminPaths();
    return adminSuccess();
  } catch (error) {
    return adminError(error instanceof Error ? error.message : "Could not delete user.");
  }
}

export async function dismissReportById(reportId: string): Promise<AdminActionResult> {
  const { profile } = await requireAdmin();

  try {
    await assertAdminCanMutate();
  } catch {
    return adminError("Not authorized to update reports.");
  }

  const { error } = await supabaseAdmin()
    .from("reports")
    .update({ status: "dismissed" })
    .eq("id", reportId);

  if (error) {
    return adminError(error.message);
  }

  revalidateAdminPaths();
  return adminSuccess();
}

export async function deleteReportedListing(reportId: string): Promise<AdminActionResult> {
  const { supabase } = await requireAdmin();
  const report = await getAdminReportDetail(supabase, reportId);

  if (!report) {
    return adminError("Report not found.");
  }

  try {
    await deleteListingRecord(report.listingId);

    await supabaseAdmin()
      .from("reports")
      .update({ status: "dismissed" })
      .eq("listing_id", report.listingId);

    revalidateAdminPaths(report.listingId);
    return adminSuccess();
  } catch (error) {
    return adminError(error instanceof Error ? error.message : "Could not delete listing.");
  }
}

export async function suspendReportedSeller(reportId: string): Promise<AdminActionResult> {
  const { supabase } = await requireAdmin();
  const report = await getAdminReportDetail(supabase, reportId);

  if (!report?.sellerId) {
    return adminError("Seller not found.");
  }

  return suspendUserById(report.sellerId);
}

export async function approveAllPending(): Promise<AdminActionResult> {
  const { user, profile } = await requireAdmin();

  try {
    await assertAdminCanMutate();
  } catch {
    return adminError("Not authorized to update listings.");
  }

  const { error } = await supabaseAdmin()
    .from("listings")
    .update({
      status: "approved",
      rejection_reason: null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("status", "pending");

  if (error) {
    return adminError(error.message);
  }

  revalidateAdminPaths();
  return adminSuccess();
}

export async function exportListingsCsv() {
  const { supabase } = await requireAdmin();
  const data = await getAdminTableData(supabase, { tab: "listings", sort: "newest" });
  const header = "Title,Seller,Status,Price,Views,Created\n";
  const rows = data.listings
    .map((listing) =>
      [
        `"${listing.title.replace(/"/g, '""')}"`,
        `"${listing.sellerName.replace(/"/g, '""')}"`,
        listing.status,
        listing.price,
        listing.views,
        `"${listing.createdAt}"`,
      ].join(","),
    )
    .join("\n");

  return `${header}${rows}`;
}

// Legacy form actions for any remaining forms
export async function approveListing(formData: FormData) {
  await approveListingById(String(formData.get("listingId")));
}

export async function rejectListing(formData: FormData) {
  await rejectListingById(String(formData.get("listingId")), "Rejected by admin");
}

export async function deleteAdminListing(formData: FormData) {
  await deleteListingById(String(formData.get("listingId")));
}
