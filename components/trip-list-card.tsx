import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DeleteTripButton from "@/components/delete-trip-button";
import type { ApiTrip } from "@/types/api";
import { getTotalTripDays, getTripDayNumber } from "@/lib/trip-dates";
import { ArrowRight, CalendarIcon, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface TripListCardProps {
  trip: ApiTrip;
  variant?: "default" | "active" | "past";
}

export default function TripListCard({
  trip,
  variant = "default",
}: TripListCardProps) {
  const today = new Date();
  const dayNumber = getTripDayNumber(trip.startDate, today);
  const totalDays = getTotalTripDays(trip.startDate, trip.endDate);
  const isActive = variant === "active";

  return (
    <div className='group relative h-full'>
      <Link href={`/trips/${trip.id}`} className='block h-full'>
        <Card
          className={`flex h-full flex-col overflow-hidden transition-all duration-200 ${
            isActive
              ? "border-2 border-emerald-400 shadow-md ring-1 ring-emerald-100 hover:border-emerald-500 hover:shadow-lg"
              : variant === "past"
                ? "opacity-90 hover:border-gray-400"
                : "hover:border-blue-500"
          }`}
        >
          <div className='relative h-40 w-full'>
            {trip.imageUrl ? (
              <Image
                src={trip.imageUrl}
                alt={trip.title}
                fill
                className='object-cover'
              />
            ) : (
              <div
                className={`flex h-full items-center justify-center ${
                  isActive ? "bg-emerald-50" : "bg-gray-200"
                }`}
              >
                <p className='text-gray-500'>No image</p>
              </div>
            )}
            {isActive && (
              <span className='absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm'>
                <Sparkles className='h-3 w-3' />
                Active now
              </span>
            )}
          </div>
          <CardHeader className='pb-2'>
            <CardTitle className='line-clamp-1 text-xl group-hover:text-blue-700'>
              {trip.title}
            </CardTitle>
          </CardHeader>
          <CardContent className='flex flex-grow flex-col'>
            <p className='line-clamp-2 flex-grow text-gray-600'>{trip.description}</p>
            <div className='mt-4 space-y-2'>
              <div className='flex items-center gap-2 text-sm text-gray-500'>
                <CalendarIcon className='h-4 w-4 shrink-0' />
                <span>
                  {new Date(trip.startDate).toLocaleDateString()} –{" "}
                  {new Date(trip.endDate).toLocaleDateString()}
                </span>
              </div>
              {isActive && (
                <div className='flex items-center justify-between gap-2'>
                  <span className='rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800'>
                    Day {dayNumber} of {totalDays}
                  </span>
                  <span className='inline-flex items-center gap-1 text-xs font-semibold text-emerald-700'>
                    Open trip
                    <ArrowRight className='h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5' />
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
      <DeleteTripButton
        tripId={trip.id}
        tripTitle={trip.title}
        variant='icon'
        className='absolute right-3 top-3 z-10'
      />
    </div>
  );
}
