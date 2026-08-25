/** True when a trip image is a Google Static Maps URL (often includes API key). */
export function isGoogleStaticMapUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return (
      host === "maps.googleapis.com" &&
      url.includes("/maps/api/staticmap")
    );
  } catch {
    return url.includes("maps.googleapis.com/maps/api/staticmap");
  }
}

/** Same-origin proxy path for location preview maps. */
export function isStaticMapProxyUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("/api/static-map");
}

export function isTripMapImageUrl(url: string | null | undefined): boolean {
  return isGoogleStaticMapUrl(url) || isStaticMapProxyUrl(url);
}

/**
 * Build a trip preview image URL from a location name.
 * Uses a same-origin proxy so production is not blocked by Google API key
 * HTTP-referrer restrictions (localhost often works; Vercel domains do not).
 */
export function buildLocationImageUrl(location: string): string | null {
  const trimmedLocation = location.trim();
  if (!trimmedLocation) return null;
  return `/api/static-map?center=${encodeURIComponent(trimmedLocation)}`;
}

/**
 * Resolve a stored trip image for display.
 * Rewrites legacy Google Static Maps URLs (with embedded API keys) through
 * the proxy so they keep working in production.
 */
export function resolveTripImageSrc(url: string | null | undefined): string | null {
  if (!url) return null;

  if (isStaticMapProxyUrl(url)) return url;

  if (isGoogleStaticMapUrl(url)) {
    try {
      const parsed = new URL(url);
      const center = parsed.searchParams.get("center");
      if (center) {
        return `/api/static-map?center=${encodeURIComponent(center)}`;
      }
    } catch {
      // fall through
    }
  }

  return url;
}
