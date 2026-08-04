/** True when a trip image is a Google Static Maps URL (includes API key). */
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
