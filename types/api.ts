// Mirror API response types (no Prisma)

export interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "USER" | "ADMIN";
}

export interface ApiLocation {
  id: string;
  tripId: string;
  locationTitle: string;
  latitude: number;
  longitude: number;
  order: number;
  createAt: string;
  updateAt: string | null;
}

export interface ApiTrip {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  startDate: string;
  endDate: string;
  userId: string;
  destinationCity?: string | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  createAt: string;
  updateAt: string | null;
  locations?: ApiLocation[];
  activities?: ApiActivity[];
}

export interface ApiActivity {
  id: string;
  tripId: string;
  title: string;
  description: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startTime: string;
  endTime: string;
  order: number;
  createAt: string;
  updateAt: string | null;
  syncedLocation?: ApiLocation | null;
}

export type ExpenseCategory =
  | "TRANSPORT"
  | "ACCOMMODATION"
  | "FOOD"
  | "ACTIVITIES"
  | "SHOPPING"
  | "OTHER";

export interface ApiExpense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  expenseDate: string;
  notes: string | null;
  activityId: string | null;
  createAt: string;
  updateAt: string | null;
}

export interface PrayerTimings {
  date: string;
  timezone: string;
  timings: {
    Fajr: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
  };
}

export interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  category?: string;
  about: string;
}

export interface ActivityRecommendationRow {
  sourceLocation: {
    id: string;
    title: string;
    latitude: number;
    longitude: number;
  };
  recommendations: NearbyPlace[];
  error: string | null;
}

export interface ActivityRecommendationsResponse {
  radius: number;
  source: string;
  note: string;
  rows: ActivityRecommendationRow[];
}

export type TravelMode = "walking" | "driving" | "transit";

export interface ActivityTravelTimeSegment {
  fromActivityId: string;
  fromTitle: string;
  toActivityId: string;
  toTitle: string;
  estimate: {
    distanceText: string;
    distanceMeters: number;
    durationText: string;
    durationSeconds: number;
    mode: TravelMode;
    modeLabel: string;
    autoWalk: boolean;
  } | null;
  error: string | null;
}

export interface ActivityTravelTimesResponse {
  date: string | null;
  mode?: TravelMode;
  segments: ActivityTravelTimeSegment[];
}

export interface PlaceSuggestion {
  id: string;
  description: string;
}

export interface TransformedLocation {
  name: string;
  latitude: number;
  longitude: number;
  county?: string;
  tripId: string;
  tripTitle: string;
  locationTitle: string;
  order: number;
}
