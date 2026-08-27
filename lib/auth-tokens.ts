export const ACCESS_COOKIE = "jwt";
export const REFRESH_COOKIE = "refresh";
export const ACCESS_MAX_AGE = 60 * 30;
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getAccessToken(): string | null {
  return readCookie(ACCESS_COOKIE);
}

export function getRefreshToken(): string | null {
  return readCookie(REFRESH_COOKIE);
}

export function storeAuthTokens(accessToken: string, refreshToken?: string | null) {
  if (typeof document === "undefined") return;
  document.cookie = `${ACCESS_COOKIE}=${encodeURIComponent(accessToken)}; path=/; max-age=${ACCESS_MAX_AGE}; SameSite=Lax`;
  if (refreshToken) {
    document.cookie = `${REFRESH_COOKIE}=${encodeURIComponent(refreshToken)}; path=/; max-age=${REFRESH_MAX_AGE}; SameSite=Lax`;
  }
}

export function clearAuthTokens() {
  if (typeof document === "undefined") return;
  document.cookie = `${ACCESS_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${REFRESH_COOKIE}=; path=/; max-age=0`;
}

export function isJwtExpired(token: string, skewMs = 30_000): boolean {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return true;
    const payload = JSON.parse(
      atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    if (typeof payload.exp !== "number") return true;
    return payload.exp * 1000 < Date.now() + skewMs;
  } catch {
    return true;
  }
}
