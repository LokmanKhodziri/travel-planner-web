import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  isJwtExpired,
} from "@/lib/auth-tokens";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function applyAuthCookies(
  request: NextRequest,
  accessToken: string,
  refreshToken: string,
) {
  const remaining = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(
      (part) =>
        part &&
        !part.startsWith(`${ACCESS_COOKIE}=`) &&
        !part.startsWith(`${REFRESH_COOKIE}=`),
    );
  remaining.push(
    `${ACCESS_COOKIE}=${encodeURIComponent(accessToken)}`,
    `${REFRESH_COOKIE}=${encodeURIComponent(refreshToken)}`,
  );

  const headers = new Headers(request.headers);
  headers.set("cookie", remaining.join("; "));
  const response = NextResponse.next({ request: { headers } });
  response.cookies.set(ACCESS_COOKIE, accessToken, {
    path: "/",
    maxAge: ACCESS_MAX_AGE,
    sameSite: "lax",
  });
  response.cookies.set(REFRESH_COOKIE, refreshToken, {
    path: "/",
    maxAge: REFRESH_MAX_AGE,
    sameSite: "lax",
  });
  return response;
}

function clearAuthCookies(request: NextRequest) {
  const remaining = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(
      (part) =>
        part &&
        !part.startsWith(`${ACCESS_COOKIE}=`) &&
        !part.startsWith(`${REFRESH_COOKIE}=`),
    );
  const headers = new Headers(request.headers);
  if (remaining.length) headers.set("cookie", remaining.join("; "));
  else headers.delete("cookie");
  const response = NextResponse.next({ request: { headers } });
  response.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshToken || (accessToken && !isJwtExpired(accessToken))) {
    return NextResponse.next();
  }

  try {
    const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    if (!refreshResponse.ok) {
      return clearAuthCookies(request);
    }

    const data = (await refreshResponse.json()) as {
      token?: string;
      refreshToken?: string;
    };
    if (!data.token || !data.refreshToken) {
      return clearAuthCookies(request);
    }

    return applyAuthCookies(request, data.token, data.refreshToken);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
