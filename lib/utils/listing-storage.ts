const PUBLIC_LISTING_IMAGES_MARKER = "/storage/v1/object/public/listing-images/";

export function listingImageUrlToStoragePath(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  const markerIndex = trimmed.indexOf(PUBLIC_LISTING_IMAGES_MARKER);
  if (markerIndex === -1) {
    return null;
  }

  return trimmed.slice(markerIndex + PUBLIC_LISTING_IMAGES_MARKER.length);
}

export function listingImageUrlsToStoragePaths(urls: string[]): string[] {
  return urls
    .map(listingImageUrlToStoragePath)
    .filter((path): path is string => Boolean(path));
}

export async function deleteListingStorageFolder(
  storageClient: {
    storage: {
      from: (bucket: string) => {
        list: (
          path: string,
        ) => Promise<{ data: Array<{ name: string }> | null; error: { message: string } | null }>;
        remove: (paths: string[]) => Promise<{ error: { message: string } | null }>;
      };
    };
  },
  userId: string,
  listingId: string,
): Promise<void> {
  const prefix = `${userId}/${listingId}`;
  const { data: files, error: listError } = await storageClient.storage
    .from("listing-images")
    .list(prefix);

  if (listError) {
    console.error("[listing-storage] Failed to list storage folder", { prefix, listError });
    return;
  }

  if (!files?.length) {
    return;
  }

  const paths = files.map((file) => `${prefix}/${file.name}`);
  const { error: removeError } = await storageClient.storage.from("listing-images").remove(paths);

  if (removeError) {
    console.error("[listing-storage] Failed to remove storage folder", { prefix, removeError });
  }
}

export async function deleteListingImageStoragePaths(
  storageClient: {
    storage: {
      from: (bucket: string) => {
        remove: (paths: string[]) => Promise<{ error: { message: string } | null }>;
      };
    };
  },
  urls: string[],
): Promise<void> {
  const paths = listingImageUrlsToStoragePaths(urls);
  if (paths.length === 0) {
    return;
  }

  const { error } = await storageClient.storage.from("listing-images").remove(paths);
  if (error) {
    console.error("[listing-storage] Failed to remove image paths", { paths, error });
  }
}
