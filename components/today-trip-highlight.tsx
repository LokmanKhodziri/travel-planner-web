import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ApiActivity, ApiLocation, ApiTrip, PrayerTimings } from "@/types/api";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  MapPin,
  Moon,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface TodayTripHighlightProps {
  trip: ApiTrip & { locations: ApiLocation[]; activities: ApiActivity[] };
  prayerTimes: PrayerTimings | null;
  todayKey: string;
}

const PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTripDayNumber(startDate: string, today: Date) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  return Math.floor((cursor.getTime() - start.getTime()) / 86_400_000) + 1;
}

function getTotalTripDays(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parsePrayerMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getNextPrayer(timings: PrayerTimings["timings"], now: Date) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const name of PRAYER_ORDER) {
    if (parsePrayerMinutes(timings[name]) > nowMinutes) {
      return { name, time: timings[name] };
    }
  }

  return null;
}

export default function TodayTripHighlight({
  trip,
  prayerTimes,
  todayKey,
}: TodayTripHighlightProps) {
  const now = new Date();
  const dayNumber = getTripDayNumber(trip.startDate, now);
  const totalDays = getTotalTripDays(trip.startDate, trip.endDate);
  const todayActivities = [...(trip.activities ?? [])]
    .filter((activity) => localDateKey(new Date(activity.startTime)) === todayKey)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const currentActivity = todayActivities.find((activity) => {
    const start = new Date(activity.startTime);
    const end = new Date(activity.endTime);
    return start <= now && end >= now;
  });

  const nextActivity = todayActivities.find(
    (activity) => new Date(activity.startTime) > now,
  );

  const nextPrayer = prayerTimes
    ? getNextPrayer(prayerTimes.timings, now)
    : null;
  const previewActivities = todayActivities.slice(0, 4);

  return (
    <section className='overflow-hidden rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-white to-emerald-50 shadow-sm'>
      <div className='grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]'>
        <div className='p-6 lg:p-8'>
          <div className='mb-4 flex flex-wrap items-center gap-2'>
            <span className='inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white'>
              <Sparkles className='h-3.5 w-3.5' />
              Happening today
            </span>
            <span className='rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-blue-800 ring-1 ring-blue-100'>
              Day {dayNumber} of {totalDays}
            </span>
          </div>

          <h2 className='text-2xl font-bold text-gray-900 sm:text-3xl'>
            {trip.title}
          </h2>
          <p className='mt-2 max-w-xl text-gray-600'>{trip.description}</p>

          <div className='mt-5 grid gap-3 sm:grid-cols-3'>
            <Card className='border-blue-100 bg-white/80 shadow-none'>
              <CardContent className='p-4'>
                <p className='text-xs font-medium uppercase text-gray-500'>
                  Today&apos;s plan
                </p>
                <p className='mt-1 text-2xl font-bold text-gray-900'>
                  {todayActivities.length}
                </p>
                <p className='text-xs text-gray-500'>
                  activit{todayActivities.length === 1 ? "y" : "ies"} scheduled
                </p>
              </CardContent>
            </Card>
            <Card className='border-blue-100 bg-white/80 shadow-none'>
              <CardContent className='p-4'>
                <p className='text-xs font-medium uppercase text-gray-500'>
                  Locations
                </p>
                <p className='mt-1 text-2xl font-bold text-gray-900'>
                  {trip.locations.length}
                </p>
                <p className='text-xs text-gray-500'>saved stops</p>
              </CardContent>
            </Card>
            <Card className='border-emerald-100 bg-white/80 shadow-none'>
              <CardContent className='p-4'>
                <p className='text-xs font-medium uppercase text-gray-500'>
                  Next prayer
                </p>
                <p className='mt-1 text-lg font-bold text-emerald-900'>
                  {nextPrayer ? nextPrayer.name : "—"}
                </p>
                <p className='text-xs text-emerald-700'>
                  {nextPrayer ? nextPrayer.time : "Add a location for times"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className='mt-5 rounded-xl border border-blue-100 bg-white/90 p-4'>
            {currentActivity ? (
              <div>
                <p className='text-xs font-semibold uppercase tracking-wide text-blue-600'>
                  Right now
                </p>
                <p className='mt-1 font-semibold text-gray-900'>
                  {currentActivity.title}
                </p>
                <p className='mt-1 flex items-center gap-1 text-sm text-gray-500'>
                  <Clock className='h-4 w-4' />
                  Until {timeLabel(currentActivity.endTime)}
                </p>
              </div>
            ) : nextActivity ? (
              <div>
                <p className='text-xs font-semibold uppercase tracking-wide text-blue-600'>
                  Up next
                </p>
                <p className='mt-1 font-semibold text-gray-900'>
                  {nextActivity.title}
                </p>
                <p className='mt-1 flex items-center gap-1 text-sm text-gray-500'>
                  <Clock className='h-4 w-4' />
                  Starts at {timeLabel(nextActivity.startTime)}
                </p>
              </div>
            ) : todayActivities.length > 0 ? (
              <p className='text-sm text-gray-600'>
                No more activities left for today. Great job finishing your plan!
              </p>
            ) : (
              <p className='text-sm text-gray-600'>
                No activities planned for today yet. Open the planner to build
                your day.
              </p>
            )}
          </div>

          <div className='mt-5 flex flex-wrap gap-3'>
            <Link href={`/trips/${trip.id}?tab=activities`}>
              <Button className='gap-2'>
                <CalendarDays className='h-4 w-4' />
                Open today&apos;s planner
              </Button>
            </Link>
            <Link href={`/trips/${trip.id}?tab=prayer`}>
              <Button variant='outline' className='gap-2'>
                <Moon className='h-4 w-4' />
                Prayer times
              </Button>
            </Link>
            <Link href={`/trips/${trip.id}`}>
              <Button variant='outline' className='gap-2'>
                Full trip
                <ArrowRight className='h-4 w-4' />
              </Button>
            </Link>
          </div>
        </div>

        <div className='border-t border-blue-100 bg-white/60 p-6 lg:border-l lg:border-t-0 lg:p-8'>
          <div className='relative mb-4 h-40 overflow-hidden rounded-xl border border-gray-200'>
            {trip.imageUrl ? (
              <Image
                src={trip.imageUrl}
                alt={trip.title}
                fill
                className='object-cover'
              />
            ) : (
              <div className='flex h-full items-center justify-center bg-gray-100 text-gray-500'>
                No trip image
              </div>
            )}
          </div>

          <h3 className='mb-3 text-sm font-semibold text-gray-900'>
            Today&apos;s schedule
          </h3>

          {previewActivities.length === 0 ? (
            <p className='rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500'>
              Your timeline is empty for today. Add activities from the planner or
              recommendations.
            </p>
          ) : (
            <ol className='space-y-2'>
              {previewActivities.map((activity, index) => {
                const isCurrent = currentActivity?.id === activity.id;
                const isNext = !currentActivity && nextActivity?.id === activity.id;

                return (
                  <li
                    key={activity.id}
                    className={`rounded-lg border px-3 py-2.5 ${
                      isCurrent
                        ? "border-blue-300 bg-blue-50"
                        : isNext
                          ? "border-amber-200 bg-amber-50"
                          : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-medium text-gray-900'>
                          {index + 1}. {activity.title}
                        </p>
                        <p className='mt-0.5 flex items-center gap-1 text-xs text-gray-500'>
                          <Clock className='h-3.5 w-3.5' />
                          {timeLabel(activity.startTime)} –{" "}
                          {timeLabel(activity.endTime)}
                        </p>
                        {activity.address ? (
                          <p className='mt-1 flex items-start gap-1 text-xs text-gray-500'>
                            <MapPin className='mt-0.5 h-3 w-3 shrink-0' />
                            <span className='line-clamp-1'>{activity.address}</span>
                          </p>
                        ) : null}
                      </div>
                      {isCurrent ? (
                        <span className='shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white'>
                          Now
                        </span>
                      ) : isNext ? (
                        <span className='shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white'>
                          Next
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {todayActivities.length > previewActivities.length && (
            <Link
              href={`/trips/${trip.id}?tab=activities`}
              className='mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700'
            >
              View all {todayActivities.length} activities
              <ArrowRight className='h-4 w-4' />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
