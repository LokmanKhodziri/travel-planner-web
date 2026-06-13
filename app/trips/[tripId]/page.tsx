import { getSession, fetchApiServer } from "@/lib/auth";
import TripDetailClient, {
  type TripWithLocations,
} from "@/components/trip-detail";
import type { ApiTrip, ApiLocation, ApiActivity } from "@/types/api";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const session = await getSession();

  if (!session) {
    return (
      <div className='flex justify-center items-center h-screen text-gray-700 text-xl'>
        Please Sign In.
      </div>
    );
  }

  let trip:
    | (ApiTrip & { locations: ApiLocation[]; activities: ApiActivity[] })
    | null = null;
  try {
    trip = await fetchApiServer<
      ApiTrip & { locations: ApiLocation[]; activities: ApiActivity[] }
    >(`/api/trips/${tripId}`);
  } catch {
    trip = null;
  }

  if (!trip) {
    return (
      <div className='flex justify-center items-center h-screen text-gray-700 text-xl'>
        Trip Not Found.
      </div>
    );
  }

  const tripWithDates = {
    ...trip,
    startDate: new Date(trip.startDate),
    endDate: new Date(trip.endDate),
    locations: trip.locations.map((loc) => ({
      ...loc,
      createAt: new Date(loc.createAt),
      updateAt: loc.updateAt ? new Date(loc.updateAt) : null,
    })),
    activities: trip.activities.map((activity) => ({
      ...activity,
      createAt: new Date(activity.createAt),
      updateAt: activity.updateAt ? new Date(activity.updateAt) : null,
    })),
  } as TripWithLocations;

  return <TripDetailClient trip={tripWithDates} />;
}
