export type SellPhotoItem =
  | { source: "existing"; url: string; id: string }
  | { source: "new"; file: File; id: string };

export const MAX_SELL_PHOTOS = 7;

export function createSellPhotoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getSellPhotoPreview(item: SellPhotoItem): string {
  return item.source === "existing" ? item.url : URL.createObjectURL(item.file);
}

export function moveSellPhoto(items: SellPhotoItem[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
