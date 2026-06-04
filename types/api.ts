// Mirror API response types (no Prisma)

export interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
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
  startTime: string;
  endTime: string;
  order: number;
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
  openNow?: boolean;
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
}
