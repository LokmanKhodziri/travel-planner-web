import Link from "next/link";
import { MapPin, Plus, Sparkles } from "lucide-react";
import { Button } from "./ui/button";

interface PlannerGettingStartedProps {
  tripId: string;
  hasLocations: boolean;
  onAddActivity: () => void;
}

export default function PlannerGettingStarted({
  tripId,
  hasLocations,
  onAddActivity,
}: PlannerGettingStartedProps) {
  return (
    <section className='rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5'>
      <h3 className='text-lg font-semibold text-gray-900'>Start planning your trip</h3>
      <p className='mt-1 text-sm text-gray-600'>
        Follow these steps to build your first day. You can hide this once you add
        an activity.
      </p>

      <ol className='mt-4 space-y-3'>
        <li className='flex items-start gap-3 rounded-lg border border-blue-100 bg-white p-3'>
          <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white'>
            1
          </span>
          <div className='min-w-0 flex-1'>
            <p className='font-medium text-gray-900'>Add trip destinations</p>
            <p className='mt-0.5 text-sm text-gray-500'>
              Saved places power recommendations and prayer times.
            </p>
            {!hasLocations && (
              <Button asChild size='sm' variant='outline' className='mt-2 gap-2'>
                <Link href={`/trips/${tripId}?tab=itinerary`}>
                  <MapPin className='h-4 w-4' />
                  Add destinations
                </Link>
              </Button>
            )}
            {hasLocations && (
              <p className='mt-2 text-xs font-medium text-emerald-700'>
                Destinations added — you&apos;re ready for step 2.
              </p>
            )}
          </div>
        </li>

        <li className='flex items-start gap-3 rounded-lg border border-blue-100 bg-white p-3'>
          <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white'>
            2
          </span>
          <div>
            <p className='font-medium text-gray-900'>Pick a day</p>
            <p className='mt-0.5 text-sm text-gray-500'>
              Use the day tabs above to choose which day you&apos;re planning.
            </p>
          </div>
        </li>

        <li className='flex items-start gap-3 rounded-lg border border-blue-100 bg-white p-3'>
          <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white'>
            3
          </span>
          <div className='min-w-0 flex-1'>
            <p className='font-medium text-gray-900'>Add your first activity</p>
            <p className='mt-0.5 text-sm text-gray-500'>
              Add manually or pick a suggestion from recommendations below.
            </p>
            <div className='mt-2 flex flex-wrap gap-2'>
              <Button size='sm' className='gap-2' onClick={onAddActivity}>
                <Plus className='h-4 w-4' />
                Add activity
              </Button>
              {hasLocations && (
                <p className='flex items-center gap-1 text-xs text-gray-500'>
                  <Sparkles className='h-3.5 w-3.5' />
                  Or scroll to recommendations
                </p>
              )}
            </div>
          </div>
        </li>
      </ol>
    </section>
  );

}
