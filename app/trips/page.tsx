import { getSession, fetchApiServer } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiTrip } from "@/types/api";
import { CalendarIcon, PlusIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function TripsPage() {
  const session = await getSession();

  if (!session) {
    return (
      <div className='flex justify-center items-center h-screen text-gray-700 text-xl'>
        Please Sign In.
      </div>
    );
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

  return (
    <div className='space-y-8 container mx-auto px-4 py-10'>
      <header className='flex flex-col gap-4 sm:flex-row sm:items-center justify-between'>
        <h1 className='text-3xl sm:text-4xl font-bold tracking-tight'>
          Dashboard
        </h1>
        <Link href='/trips/new' className='w-full sm:w-auto'>
          <Button className='flex w-full items-center justify-center gap-2 sm:w-auto'>
            <PlusIcon className='h-5 w-5' />
            New Trip
          </Button>
        </Link>
      </header>

      <section>
        <Card className='bg-gray-50 border-gray-200'>
          <CardHeader>
            <CardTitle className='text-2xl'>
              Welcome back, {session.name ?? "there"}!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-gray-600'>
              {trips.length === 0
                ? "You have no trips planned. Get started by creating a new one."
                : `You have ${trips.length} trip${trips.length > 1 ? "s" : ""} in total. ${
                    upcomingTrips.length > 0
                      ? `You have ${upcomingTrips.length} upcoming trip${upcomingTrips.length > 1 ? "s" : ""}.`
                      : ""
                  }`}
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className='text-2xl font-semibold mb-4'>Your Recent Trips</h2>
        {trips.length === 0 ? (
          <Card className='flex flex-col items-center justify-center text-center py-12'>
            <CardContent>
              <h3 className='text-xl font-medium mb-2'>No trips yet!</h3>
              <p className='text-gray-500 mb-6 max-w-sm'>
                It looks like you haven&apos;t planned any trips. Click the
                button below to create your first one.
              </p>
              <Link href='/trips/new'>
                <Button>Create a New Trip</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
            {sortedTrips.slice(0, 3).map((trip) => (
              <Link href={`/trips/${trip.id}`} key={trip.id}>
                <Card className='h-full flex flex-col hover:border-blue-500 transition-colors duration-200'>
                  <div className='relative h-40 w-full'>
                    {trip.imageUrl ? (
                      <Image
                        src={trip.imageUrl}
                        alt={trip.title}
                        fill
                        className='rounded-t-lg object-cover'
                      />
                    ) : (
                      <div className='h-full bg-gray-200 flex items-center justify-center rounded-t-lg'>
                        <p className='text-gray-500'>Image Placeholder</p>
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className='text-xl line-clamp-1'>
                      {trip.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='flex-grow flex flex-col'>
                    <p className='text-gray-600 line-clamp-2 flex-grow'>
                      {trip.description}
                    </p>
                    <div className='mt-4 space-y-2 text-sm text-gray-500'>
                      <div className='flex items-center gap-2'>
                        <CalendarIcon className='h-4 w-4' />
                        <span>
                          {new Date(trip.startDate).toLocaleDateString()} -{" "}
                          {new Date(trip.endDate).toLocaleDateString()}
                        </span>
                      </div>
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
