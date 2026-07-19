export function formatNaira(value: number) {
  // Deterministic formatting — avoid Intl.NumberFormat hydration mismatches
  // between Node (SSR) and browser (client) ICU data for en-NG currency.
  const amount = Number.isFinite(value) ? Math.round(value) : 0;
  const digits = Math.abs(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return amount < 0 ? `₦-${digits}` : `₦${digits}`;
}

export function formatViews(views: number) {
  if (views < 1000) {
    return `${views} views`;
  }

  return `${(views / 1000).toFixed(1)}k views`;
}

/** Compact view count for cards (no "views" suffix). */
export function formatViewCount(views: number) {
  const value = Number.isFinite(views) ? Math.max(0, Math.round(views)) : 0;
  if (value < 1000) {
    return String(value);
  }
  return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

export function truncateText(value: string, maxLength = 12) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength)}...`;
}

/** Clean marketplace location: "GRA, Onitsha" */
export function formatListingLocation(area: string, city: string, maxLength = 28) {
  const parts = [area, city]
    .map((part) => part.trim())
    .filter(Boolean);
  const label = parts.join(", ");
  if (!maxLength || label.length <= maxLength) {
    return label;
  }
  return truncateText(label, maxLength);
}

/** Strip placeholder demo tags from listing titles for display. */
export function sanitizeListingTitle(title: string) {
  return title
    .replace(/\s*\(\s*Demo\s+[Ll]isting\s*\)\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Two-letter (or one) initials for seller avatar fallbacks. */
export function getSellerInitials(name: string | null | undefined) {
  const parts = (name || "Seller")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }

  return (parts[0]?.[0] ?? "S").toUpperCase();
}

export function formatSavedTime(savedAt: string) {
  const savedTime = new Date(savedAt).getTime();
  const diffMs = Date.now() - savedTime;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return diffMinutes === 1
      ? "Saved 1 minute ago"
      : `Saved ${diffMinutes} minutes ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours === 1
      ? "Saved 1 hour ago"
      : `Saved ${diffHours} hours ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? "Saved 1 day ago" : `Saved ${diffDays} days ago`;
}

export { formatRelativeTime } from "@/lib/utils/relative-time";

