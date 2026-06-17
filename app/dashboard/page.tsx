import { getSession, fetchApiServer } from "@/lib/auth";
import TodayTripHighlight from "@/components/today-trip-highlight";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ApiActivity,
  ApiLocation,
  ApiTrip,
  PrayerTimings,
} from "@/types/api";
import {
  ArrowRight,
  CalendarIcon,
  Globe2,
  MapIcon,
  PlusIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  isTripActiveOnDate,
  isTripUpcoming,
  localDateKey,
} from "@/lib/trip-dates";

export default async function DashboardPage() {
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

  const sortedTrips = [...trips].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = localDateKey(today);
  const todayTrips = sortedTrips.filter((trip) => isTripActiveOnDate(trip, today));
  const upcomingTrips = sortedTrips.filter((trip) => isTripUpcoming(trip, today));
  const recentTrips = sortedTrips
    .filter((trip) => !todayTrips.some((todayTrip) => todayTrip.id === trip.id))
    .slice(0, 3);

  let todayTripDetail:
    | (ApiTrip & { locations: ApiLocation[]; activities: ApiActivity[] })
    | null = null;
  let todayPrayerTimes: PrayerTimings | null = null;

  if (todayTrips[0]) {
    try {
      todayTripDetail = await fetchApiServer<
        ApiTrip & { locations: ApiLocation[]; activities: ApiActivity[] }
      >(`/api/trips/${todayTrips[0].id}`);

      if (todayTripDetail.locations.length > 0) {
        todayPrayerTimes = await fetchApiServer<PrayerTimings>(
          `/api/trips/${todayTrips[0].id}/prayer-times?date=${encodeURIComponent(todayKey)}`,
        );
      }
    } catch {
      todayTripDetail = null;
      todayPrayerTimes = null;
    }
  }

  return (
    <div className='page-shell space-y-8 py-10'>
      <header>
        <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
          Dashboard
        </h1>
        <p className='mt-2 text-gray-600'>
          Your travel planning hub — quick overview and shortcuts.
        </p>
      </header>

      {todayTripDetail && (
        <TodayTripHighlight
          trip={todayTripDetail}
          prayerTimes={todayPrayerTimes}
          todayKey={todayKey}
        />
      )}

      <section>
        <Card className='border-gray-200 bg-gradient-to-br from-blue-50 to-emerald-50'>
          <CardHeader>
            <CardTitle className='text-2xl'>
              Welcome back, {session.name ?? "there"}!
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-gray-600'>
              {trips.length === 0
                ? "You have no trips planned yet. Create your first trip to get started."
                : todayTrips.length > 0
                  ? `You have ${todayTrips.length} trip${todayTrips.length > 1 ? "s" : ""} happening today and ${upcomingTrips.length} upcoming in total.`
                  : `You have ${trips.length} trip${trips.length > 1 ? "s" : ""} in total${
                      upcomingTrips.length > 0
                        ? `, with ${upcomingTrips.length} upcoming.`
                        : "."
                    }`}
            </p>
            <div className='flex flex-wrap gap-3'>
              <Link href='/trips/new'>
                <Button className='gap-2'>
                  <PlusIcon className='h-4 w-4' />
                  New Trip
                </Button>
              </Link>
              <Link href='/trips'>
                <Button variant='outline' className='gap-2'>
                  <MapIcon className='h-4 w-4' />
                  My Trips
                </Button>
              </Link>
              <Link href='/globe'>
                <Button variant='outline' className='gap-2'>
                  <Globe2 className='h-4 w-4' />
                  Explore Globe
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className='grid gap-4 sm:grid-cols-3'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-500'>
              Total Trips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-bold text-gray-900'>{trips.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-500'>
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-bold text-gray-900'>
              {upcomingTrips.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-500'>
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-bold text-gray-900'>
              {todayTrips.length}
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className='mb-4 flex items-center justify-between gap-4'>
          <h2 className='text-2xl font-semibold'>
            {todayTrips.length > 0 ? "More trips" : "Recent Trips"}
          </h2>
          {trips.length > 0 && (
            <Link
              href='/trips'
              className='inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700'
            >
              View all trips
              <ArrowRight className='h-4 w-4' />
            </Link>
          )}
        </div>
        {recentTrips.length === 0 ? (
          <Card className='flex flex-col items-center justify-center py-12 text-center'>
            <CardContent>
              <h3 className='mb-2 text-xl font-medium'>
                {todayTrips.length > 0
                  ? "You're focused on today's trip"
                  : "No trips yet"}
              </h3>
              <p className='mb-6 max-w-sm text-gray-500'>
                {todayTrips.length > 0
                  ? "Other trips will appear here when you have more planned."
                  : "Create your first trip to start planning day-by-day itineraries."}
              </p>
              {trips.length === 0 && (
                <Link href='/trips/new'>
                  <Button>Create a New Trip</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
            {recentTrips.map((trip) => (
              <Link href={`/trips/${trip.id}`} key={trip.id}>
                <Card className='flex h-full flex-col transition-colors duration-200 hover:border-blue-500'>
                  <div className='relative h-40 w-full'>
                    {trip.imageUrl ? (
                      <Image
                        src={trip.imageUrl}
                        alt={trip.title}
                        fill
                        className='rounded-t-lg object-cover'
                      />
                    ) : (
                      <div className='flex h-full items-center justify-center rounded-t-lg bg-gray-200'>
                        <p className='text-gray-500'>No image</p>
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className='line-clamp-1 text-xl'>
                      {trip.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='flex flex-grow flex-col'>
                    <p className='line-clamp-2 flex-grow text-gray-600'>
                      {trip.description}
                    </p>
                    <div className='mt-4 flex items-center gap-2 text-sm text-gray-500'>
                      <CalendarIcon className='h-4 w-4' />
                      <span>
                        {new Date(trip.startDate).toLocaleDateString()} -{" "}
                        {new Date(trip.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
