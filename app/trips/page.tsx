import { getSession, fetchApiServer } from "@/lib/auth";
import TodayTripHighlight from "@/components/today-trip-highlight";
import TripListCard from "@/components/trip-list-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ApiActivity, ApiLocation, ApiTrip, PrayerTimings } from "@/types/api";
import {
  isTripActiveOnDate,
  isTripPast,
  isTripUpcoming,
  localDateKey,
} from "@/lib/trip-dates";
import { MapPin, PlusIcon, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function TripsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let trips: ApiTrip[] = [];
  try {
    trips = await fetchApiServer<ApiTrip[]>("/api/trips");
  } catch {
    trips = [];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = localDateKey(today);

  const sortedTrips = [...trips].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  const activeTrips = sortedTrips.filter((trip) => isTripActiveOnDate(trip, today));
  const upcomingTrips = sortedTrips.filter((trip) => isTripUpcoming(trip, today));
  const pastTrips = sortedTrips
    .filter((trip) => isTripPast(trip, today))
    .sort(
      (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
    );

  const primaryActiveTrip = activeTrips[0] ?? null;
  const otherActiveTrips = activeTrips.slice(1);

  let activeTripDetail:
    | (ApiTrip & { locations: ApiLocation[]; activities: ApiActivity[] })
    | null = null;
  let activeTripPrayerTimes: PrayerTimings | null = null;

  if (primaryActiveTrip) {
    try {
      activeTripDetail = await fetchApiServer<
        ApiTrip & { locations: ApiLocation[]; activities: ApiActivity[] }
      >(`/api/trips/${primaryActiveTrip.id}`);

      if (activeTripDetail.locations.length > 0) {
        activeTripPrayerTimes = await fetchApiServer<PrayerTimings>(
          `/api/trips/${primaryActiveTrip.id}/prayer-times?date=${encodeURIComponent(todayKey)}`,
        );
      }
    } catch {
      activeTripDetail = null;
      activeTripPrayerTimes = null;
    }
  }

  return (
    <div className='page-shell space-y-8 py-10'>
      <header className='flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
            My Trips
          </h1>
          <p className='mt-2 text-gray-600'>
            {activeTrips.length > 0
              ? "Your active trip is front and centre — upcoming and past trips below."
              : "Browse and manage all of your planned trips."}
          </p>
        </div>
        <Link href='/trips/new' className='w-full sm:w-auto'>
          <Button className='flex w-full items-center justify-center gap-2 sm:w-auto'>
            <PlusIcon className='h-5 w-5' />
            New Trip
          </Button>
        </Link>
      </header>

      {trips.length === 0 ? (
        <Card className='flex flex-col items-center justify-center py-12 text-center'>
          <CardContent>
            <h3 className='mb-2 text-xl font-medium'>No trips yet</h3>
            <p className='mb-6 max-w-sm text-gray-500'>
              It looks like you haven&apos;t planned any trips. Create your first
              one to get started.
            </p>
            <Link href='/trips/new'>
              <Button>Create a New Trip</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-10'>
          {activeTrips.length > 0 && (
            <section className='space-y-5'>
              <div className='flex items-center gap-2'>
                <span className='inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700'>
                  <Sparkles className='h-4 w-4' />
                </span>
                <div>
                  <h2 className='text-xl font-semibold text-gray-900'>
                    Active now ({activeTrips.length})
                  </h2>
                  <p className='text-sm text-gray-500'>
                    Trips happening today — jump back into your planner.
                  </p>
                </div>
              </div>

              {activeTripDetail ? (
                <TodayTripHighlight
                  trip={activeTripDetail}
                  prayerTimes={activeTripPrayerTimes}
                  todayKey={todayKey}
                />
              ) : primaryActiveTrip ? (
                <Link href={`/trips/${primaryActiveTrip.id}`}>
                  <Card className='border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-white p-6 transition-shadow hover:shadow-md'>
                    <div className='flex flex-wrap items-center justify-between gap-4'>
                      <div>
                        <span className='rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white'>
                          Active now
                        </span>
                        <h3 className='mt-3 text-2xl font-bold text-gray-900'>
                          {primaryActiveTrip.title}
                        </h3>
                        <p className='mt-1 text-gray-600'>
                          {primaryActiveTrip.description}
                        </p>
                      </div>
                      <Button>Open trip</Button>
                    </div>
                  </Card>
                </Link>
              ) : null}

              {otherActiveTrips.length > 0 && (
                <TripGrid trips={otherActiveTrips} variant='active' />
              )}
            </section>
          )}

          {upcomingTrips.length > 0 && (
            <section>
              <h2 className='mb-1 text-xl font-semibold text-gray-900'>
                Upcoming ({upcomingTrips.length})
              </h2>
              <p className='mb-4 text-sm text-gray-500'>
                Trips starting soon — review your plan before you go.
              </p>
              <TripGrid trips={upcomingTrips} />
            </section>
          )}

          {pastTrips.length > 0 && (
            <section>
              <h2 className='mb-1 text-xl font-semibold text-gray-900'>
                Past ({pastTrips.length})
              </h2>
              <p className='mb-4 text-sm text-gray-500'>
                Completed trips you can revisit anytime.
              </p>
              <TripGrid trips={pastTrips} variant='past' />
            </section>
          )}

          {activeTrips.length === 0 &&
            upcomingTrips.length === 0 &&
            pastTrips.length > 0 && (
              <Card className='border-dashed bg-gray-50/80'>
                <CardContent className='flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between'>
                  <div className='flex items-start gap-3'>
                    <MapPin className='mt-0.5 h-5 w-5 text-gray-400' />
                    <div>
                      <p className='font-medium text-gray-900'>
                        No active or upcoming trips
                      </p>
                      <p className='text-sm text-gray-500'>
                        Plan your next adventure whenever you&apos;re ready.
                      </p>
                    </div>
                  </div>
                  <Link href='/trips/new'>
                    <Button variant='outline'>Plan a new trip</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </div>
  );
}

function TripGrid({
  trips,
  variant = "default",
}: {
  trips: ApiTrip[];
  variant?: "default" | "active" | "past";
}) {
  return (
    <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
      {trips.map((trip) => (
        <TripListCard key={trip.id} trip={trip} variant={variant} />
      ))}
    </div>
  );
}
