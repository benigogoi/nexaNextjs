export const PRODUCT_IMAGES_BUCKET = "product-images";

const PUBLIC_BUCKET_PATH = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;

export function extractStoragePathFromPublicUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  try {
    const pathname = decodeURIComponent(new URL(url).pathname);
    const markerIndex = pathname.indexOf(PUBLIC_BUCKET_PATH);

    if (markerIndex === -1) {
      return null;
    }

    return pathname.slice(markerIndex + PUBLIC_BUCKET_PATH.length);
  } catch {
    return null;
  }
}

export function getProductImagePaths(urls: Array<string | null | undefined>) {
  return urls
    .map(extractStoragePathFromPublicUrl)
    .filter((path): path is string => Boolean(path));
}
