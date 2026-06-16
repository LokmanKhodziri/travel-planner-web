import type {
  ApiTrip,
  ApiLocation,
  ApiActivity,
  TransformedLocation,
  ApiUser,
  PrayerTimings,
  NearbyPlace,
  PlaceSuggestion,
  ActivityRecommendationsResponse,
  ActivityTravelTimesResponse,
  ApiExpense,
  ExpenseCategory,
  TravelMode,
} from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const JWT_COOKIE = "jwt";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^| )${JWT_COOKIE}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options.headers,
    },
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
  getTrip: (id: string) =>
    fetchApi<ApiTrip & { locations: ApiLocation[]; activities: ApiActivity[] }>(
      `/api/trips/${id}`,
    ),
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
  addLocation: (
    tripId: string,
    address: string,
    options?: {
      locationTitle?: string;
      latitude?: number;
      longitude?: number;
    },
  ) =>
    fetchApi<ApiLocation>(`/api/trips/${tripId}/locations`, {
      method: "POST",
      body: JSON.stringify({ address, ...options }),
    }),
  syncLocationsFromActivities: (tripId: string) =>
    fetchApi<ApiLocation[]>(
      `/api/trips/${tripId}/locations/sync-from-activities`,
      { method: "POST" },
    ),
  deleteLocation: (locationId: string, tripId: string) =>
    fetchApi<{ success: boolean }>(
      `/api/locations/${locationId}?tripId=${encodeURIComponent(tripId)}`,
      {
        method: "DELETE",
      },
    ),
  reorderLocations: (tripId: string, locationIds: string[]) =>
    fetchApi<{ success: boolean }>("/api/locations/reorder", {
      method: "PATCH",
      body: JSON.stringify({ tripId, locationIds }),
    }),
  getPrayerTimes: (tripId: string, date: string) =>
    fetchApi<PrayerTimings>(
      `/api/trips/${tripId}/prayer-times?date=${encodeURIComponent(date)}`,
    ),
  getNearbyMosques: (
    tripId: string,
    radius = 5000,
    coords?: { latitude: number; longitude: number },
  ) => {
    const params = new URLSearchParams({ radius: String(radius) });
    if (coords) {
      params.set("latitude", String(coords.latitude));
      params.set("longitude", String(coords.longitude));
    }
    return fetchApi<NearbyPlace[]>(
      `/api/trips/${tripId}/nearby/mosques?${params.toString()}`,
    );
  },
  getNearbyHalal: (tripId: string, radius = 5000) =>
    fetchApi<NearbyPlace[]>(
      `/api/trips/${tripId}/nearby/halal?radius=${radius}`,
    ),
  getActivityRecommendations: (
    tripId: string,
    radius = 5000,
    options?: { exclude?: string[]; extended?: boolean },
  ) => {
    const params = new URLSearchParams({ radius: String(radius) });
    if (options?.exclude?.length) {
      params.set("exclude", options.exclude.join(","));
    }
    if (options?.extended) {
      params.set("extended", "1");
    }
    return fetchApi<ActivityRecommendationsResponse>(
      `/api/trips/${tripId}/activity-recommendations?${params.toString()}`,
    );
  },
  searchPlaces: (input: string) =>
    fetchApi<PlaceSuggestion[]>(
      `/api/places/search?input=${encodeURIComponent(input)}`,
    ),
  getActivities: (tripId: string) =>
    fetchApi<ApiActivity[]>(`/api/trips/${tripId}/activities`),
  createActivity: (
    tripId: string,
    body: {
      title: string;
      description?: string;
      startTime: string;
      endTime: string;
      address?: string;
      latitude?: number;
      longitude?: number;
    },
  ) =>
    fetchApi<ApiActivity>(`/api/trips/${tripId}/activities`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteActivity: (tripId: string, activityId: string) =>
    fetchApi<{ success: boolean }>(
      `/api/trips/${tripId}/activities/${activityId}`,
      {
        method: "DELETE",
      },
    ),
  updateActivity: (
    tripId: string,
    activityId: string,
    body: {
      title?: string;
      description?: string;
      startTime?: string;
      endTime?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
    },
  ) =>
    fetchApi<ApiActivity>(`/api/trips/${tripId}/activities/${activityId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getActivityTravelTimes: (
    tripId: string,
    date: string,
    mode: TravelMode = "driving",
  ) =>
    fetchApi<ActivityTravelTimesResponse>(
      `/api/trips/${tripId}/activities/travel-times?date=${encodeURIComponent(date)}&mode=${encodeURIComponent(mode)}`,
    ),
  getExpenses: (tripId: string) =>
    fetchApi<ApiExpense[]>(`/api/trips/${tripId}/expenses`),
  createExpense: (
    tripId: string,
    body: {
      title: string;
      amount: number;
      currency?: string;
      category: ExpenseCategory;
      expenseDate: string;
      notes?: string;
      activityId?: string;
    },
  ) =>
    fetchApi<ApiExpense>(`/api/trips/${tripId}/expenses`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteExpense: (tripId: string, expenseId: string) =>
    fetchApi<{ success: boolean }>(
      `/api/trips/${tripId}/expenses/${expenseId}`,
      { method: "DELETE" },
    ),
};

export { JWT_COOKIE, getToken };
