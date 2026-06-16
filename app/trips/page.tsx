import { getSession, fetchApiServer } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiTrip } from "@/types/api";
import { CalendarIcon, PlusIcon } from "lucide-react";
import Image from "next/image";
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

  const sortedTrips = [...trips].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingTrips = sortedTrips.filter(
    (t) => new Date(t.startDate) >= today,
  );
  const pastTrips = sortedTrips.filter((t) => new Date(t.startDate) < today);

  return (
    <div className='container mx-auto space-y-8 px-4 py-10'>
      <header className='flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
            My Trips
          </h1>
          <p className='mt-2 text-gray-600'>
            Browse and manage all of your planned trips.
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
          {upcomingTrips.length > 0 && (
            <section>
              <h2 className='mb-4 text-xl font-semibold text-gray-900'>
                Upcoming ({upcomingTrips.length})
              </h2>
              <TripGrid trips={upcomingTrips} />
            </section>
          )}
          {pastTrips.length > 0 && (
            <section>
              <h2 className='mb-4 text-xl font-semibold text-gray-900'>
                Past ({pastTrips.length})
              </h2>
              <TripGrid trips={pastTrips} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function TripGrid({ trips }: { trips: ApiTrip[] }) {
  return (
    <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
      {trips.map((trip) => (
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
              <CardTitle className='line-clamp-1 text-xl'>{trip.title}</CardTitle>
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
  );
}
