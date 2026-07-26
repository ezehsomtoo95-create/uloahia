/**
 * Public seller identity helpers.
 * profiles.username is the editable shop/display name (single source of truth).
 * full_name is kept as a fallback only when username is missing.
 */

type SellerNameFields = {
  username?: string | null;
  fullName?: string | null;
  full_name?: string | null;
};

export function formatSellerDisplayName(
  profile: SellerNameFields | null | undefined,
  fallback = "Seller",
): string {
  const username = profile?.username?.trim();
  if (username) {
    return username;
  }

  const fullName = (profile?.fullName ?? profile?.full_name)?.trim();
  if (fullName) {
    return fullName;
  }

  return fallback;
}
