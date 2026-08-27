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
  ApiTripBudget,
  ExpenseCategory,
  TravelMode,
} from "@/types/api";
import {
  ACCESS_COOKIE,
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  storeAuthTokens,
} from "@/lib/auth-tokens";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const JWT_COOKIE = ACCESS_COOKIE;

function getToken(): string | null {
  return getAccessToken();
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    clearAuthTokens();
    return false;
  }

  const data = (await res.json()) as { token?: string; refreshToken?: string };
  if (!data.token || !data.refreshToken) {
    clearAuthTokens();
    return false;
  }

  storeAuthTokens(data.token, data.refreshToken);
  return true;
}

function queueRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function requestApi(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options.headers,
    },
    credentials: "include",
  });
}

export async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let res = await requestApi(path, options);

  if (res.status === 401 && path !== "/auth/refresh") {
    const refreshed = await queueRefresh();
    if (refreshed) {
      res = await requestApi(path, options);
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export const api = {
  getMe: () => fetchApi<ApiUser>("/api/auth/me"),
  updateProfile: (body: {
    name?: string;
    homeCity?: string | null;
    timezone?: string | null;
    image?: string | null;
  }) =>
    fetchApi<ApiUser>("/api/auth/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    fetchApi<{ success: boolean }>("/api/auth/me/password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
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
  deleteTrip: (id: string) =>
    fetchApi<{ success: boolean }>(`/api/trips/${id}`, {
      method: "DELETE",
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
    order?: string[],
  ) => {
    const params = new URLSearchParams({
      date,
      mode,
    });
    if (order?.length) {
      params.set("order", order.join(","));
    }
    return fetchApi<ActivityTravelTimesResponse>(
      `/api/trips/${tripId}/activities/travel-times?${params.toString()}`,
    );
  },
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
  getTripBudget: (tripId: string) =>
    fetchApi<ApiTripBudget | null>(`/api/trips/${tripId}/budget`),
  saveTripBudget: (
    tripId: string,
    body: {
      currency: string;
      totalAmount?: number | null;
      categoryBudgets?: Partial<Record<ExpenseCategory, number>> | null;
    },
  ) =>
    fetchApi<ApiTripBudget>(`/api/trips/${tripId}/budget`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  clearTripBudget: (tripId: string) =>
    fetchApi<{ success: boolean }>(`/api/trips/${tripId}/budget`, {
      method: "DELETE",
    }),
};

export { JWT_COOKIE, getToken };
