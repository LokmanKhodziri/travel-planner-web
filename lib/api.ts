import type { ApiTrip, ApiLocation, TransformedLocation, ApiUser } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const JWT_COOKIE = "jwt";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^| )${JWT_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...options.headers },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export const api = {
  getMe: () => fetchApi<ApiUser>("/api/auth/me"),
  getTrips: () => fetchApi<ApiTrip[]>("/api/trips"),
  getTrip: (id: string) => fetchApi<ApiTrip & { locations: ApiLocation[] }>(`/api/trips/${id}`),
  createTrip: (body: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    imageUrl?: string;
  }) =>
    fetchApi<ApiTrip>("/api/trips", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getLocations: () => fetchApi<TransformedLocation[]>("/api/locations"),
  addLocation: (tripId: string, address: string) =>
    fetchApi<ApiLocation>(`/api/trips/${tripId}/locations`, {
      method: "POST",
      body: JSON.stringify({ address }),
    }),
  deleteLocation: (locationId: string, tripId: string) =>
    fetchApi<{ success: boolean }>(`/api/locations/${locationId}?tripId=${encodeURIComponent(tripId)}`, {
      method: "DELETE",
    }),
  reorderLocations: (tripId: string, locationIds: string[]) =>
    fetchApi<{ success: boolean }>("/api/locations/reorder", {
      method: "PATCH",
      body: JSON.stringify({ tripId, locationIds }),
    }),
};

export { JWT_COOKIE, getToken };
