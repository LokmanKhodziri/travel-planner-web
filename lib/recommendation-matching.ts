import type { ApiActivity, ApiLocation, NearbyPlace } from "@/types/api";

const COORD_MATCH_METERS = 250;

function normalizePlaceName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type SavedPlaceLike = {
  title: string;
  latitude?: number | null;
  longitude?: number | null;
};

function namesMatch(left: string, right: string) {
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length >= 4 && right.length >= 4) {
    return left.includes(right) || right.includes(left);
  }
  return false;
}

export function savedPlaceMatchesRecommendation(
  saved: SavedPlaceLike,
  place: NearbyPlace,
) {
  const savedName = normalizePlaceName(saved.title);
  const placeName = normalizePlaceName(place.name);

  if (namesMatch(savedName, placeName)) return true;

  if (
    saved.latitude != null &&
    saved.longitude != null &&
    Number.isFinite(saved.latitude) &&
    Number.isFinite(saved.longitude)
  ) {
    return (
      distanceMeters(
        saved.latitude,
        saved.longitude,
        place.latitude,
        place.longitude,
      ) <= COORD_MATCH_METERS
    );
  }

  return false;
}

export function isRecommendationAlreadyUsed(
  place: NearbyPlace,
  activities: ApiActivity[],
  locations: Pick<ApiLocation, "locationTitle" | "latitude" | "longitude">[],
) {
  return (
    activities.some((activity) =>
      savedPlaceMatchesRecommendation(
        {
          title: activity.title,
          latitude: activity.latitude,
          longitude: activity.longitude,
        },
        place,
      ),
    ) ||
    locations.some((location) =>
      savedPlaceMatchesRecommendation(
        {
          title: location.locationTitle,
          latitude: location.latitude,
          longitude: location.longitude,
        },
        place,
      ),
    )
  );
}

export function filterRecommendationRows<
  T extends { recommendations: NearbyPlace[]; error?: string | null },
>(
  rows: T[],
  activities: ApiActivity[],
  locations: Pick<ApiLocation, "locationTitle" | "latitude" | "longitude">[],
  excludedPlaceIds: Set<string>,
): T[] {
  return rows
    .map((row) => ({
      ...row,
      recommendations: row.recommendations.filter(
        (place) =>
          !excludedPlaceIds.has(place.id) &&
          !isRecommendationAlreadyUsed(place, activities, locations),
      ),
    }))
    .filter((row) => row.recommendations.length > 0 || row.error);
}
