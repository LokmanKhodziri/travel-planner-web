import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies Google Static Maps so the browser never hits Google with an
 * HTTP-referrer–restricted key. Production domains often fail while
 * localhost works; this route uses a server-side key instead.
 */
export async function GET(request: NextRequest) {
  const center = request.nextUrl.searchParams.get("center")?.trim();
  if (!center) {
    return NextResponse.json(
      { error: "center query parameter is required" },
      { status: 400 },
    );
  }

  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

  if (!key) {
    return NextResponse.json(
      {
        error:
          "Google Maps API key is not configured. Set GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.",
      },
      { status: 500 },
    );
  }

  const params = new URLSearchParams({
    center,
    zoom: "12",
    size: "900x420",
    scale: "2",
    maptype: "roadmap",
    markers: `color:red|${center}`,
    key,
  });

  const googleUrl = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;

  try {
    const response = await fetch(googleUrl, {
      // Static maps for a place change rarely
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        "Static map proxy failed:",
        response.status,
        detail.slice(0, 200),
      );
      return NextResponse.json(
        {
          error:
            "Failed to load map preview. Check that Maps Static API is enabled and the API key allows server requests.",
        },
        { status: 502 },
      );
    }

    const contentType = response.headers.get("content-type") ?? "image/png";
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("Static map proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch map preview" },
      { status: 502 },
    );
  }
}
