import { getSession, fetchApiServer } from "@/lib/auth";
import TripDetailClient from "@/components/trip-detail";
import type { ApiTrip, ApiLocation } from "@/types/api";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const session = await getSession();

  if (!session) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-700 text-xl">
        Please Sign In.
      </div>
    );
  }

  let trip: (ApiTrip & { locations: ApiLocation[] }) | null = null;
  try {
    trip = await fetchApiServer<ApiTrip & { locations: ApiLocation[] }>(`/api/trips/${tripId}`);
  } catch {
    trip = null;
  }

  if (!trip) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-700 text-xl">
        Trip Not Found.
      </div>
    );
  }

  return (
    <TripDetailClient
      trip={{
        ...trip,
        startDate: new Date(trip.startDate),
        endDate: new Date(trip.endDate),
        locations: trip.locations.map((loc) => ({
          ...loc,
          createAt: new Date(loc.createAt),
          updateAt: loc.updateAt ? new Date(loc.updateAt) : null,
        })),
      }}
    />
  );
}
