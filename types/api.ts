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
  createAt: string;
  updateAt: string | null;
  locations?: ApiLocation[];
}

export interface TransformedLocation {
  name: string;
  latitude: number;
  longitude: number;
  county?: string;
}
