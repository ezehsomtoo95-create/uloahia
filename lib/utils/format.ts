export function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatViews(views: number) {
  if (views < 1000) {
    return `${views} views`;
  }

  return `${(views / 1000).toFixed(1)}k views`;
}

export function formatSavedTime(savedAt: string) {
  const savedTime = new Date(savedAt).getTime();
  const diffMs = Date.now() - savedTime;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `Saved ${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Saved ${diffHours}h ago`;
  }

  return `Saved ${Math.floor(diffHours / 24)}d ago`;
}
