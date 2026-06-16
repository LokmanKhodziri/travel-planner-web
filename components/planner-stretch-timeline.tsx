"use client";

import type {
  ActivityTravelTimeSegment,
  ApiActivity,
  PrayerTimings,
} from "@/types/api";
import { Button } from "./ui/button";
import { Car, Clock, MapPin, Moon } from "lucide-react";

const PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
const PX_PER_MINUTE = 1.35;
const MIN_ACTIVITY_HEIGHT_PX = 88;
const STANDALONE_PRAYER_HEIGHT_PX = 52;
const TIMELINE_PADDING_MINUTES = 30;
const TRAVEL_CONNECTOR_HEIGHT_PX = 44;

interface PlannerDay {
  dateKey: string;
  label: string;
  shortDate: string;
}

interface PrayerMarker {
  name: (typeof PRAYER_ORDER)[number];
  time: string;
  at: Date;
  minutes: number;
}

interface ActivityBlock {
  activity: ApiActivity;
  activityIndex: number;
  startAt: Date;
  endAt: Date;
  startMinutes: number;
  durationMinutes: number;
  nestedPrayers: PrayerMarker[];
}

interface StandalonePrayerBlock {
  name: (typeof PRAYER_ORDER)[number];
  time: string;
  minutes: number;
}

interface StretchTimelineView {
  rangeStartMinutes: number;
  rangeEndMinutes: number;
  totalMinutes: number;
  activities: ActivityBlock[];
  standalonePrayers: StandalonePrayerBlock[];
}

interface PlannerStretchTimelineProps {
  dateKey: string;
  activities: ApiActivity[];
  prayerTimes: PrayerTimings | null;
  showPrayerTimes: boolean;
  plannerDays: PlannerDay[];
  travelTimeByFromActivity: Map<string, ActivityTravelTimeSegment>;
  travelTimesLoading: boolean;
  travelTimesError: string | null;
  movingActivityId: string | null;
  onMoveActivity: (activity: ApiActivity, dateKey: string) => void;
  onDeleteActivity: (activityId: string, activityTitle: string) => void;
}

function parsePrayerDateTime(dateKey: string, time: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

function minutesSinceMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function timeOnly(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function activityDateKey(activity: ApiActivity) {
  return activity.startTime.slice(0, 10);
}

function formatHourLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function buildStretchTimelineView(
  dateKey: string,
  dayActivities: ApiActivity[],
  prayerTimes: PrayerTimings | null,
  includePrayers: boolean,
): StretchTimelineView {
  const sortedActivities = [...dayActivities].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );

  const allPrayers: PrayerMarker[] =
    includePrayers && prayerTimes
      ? PRAYER_ORDER.map((name) => {
          const at = parsePrayerDateTime(dateKey, prayerTimes.timings[name]);
          return {
            name,
            time: prayerTimes.timings[name],
            at,
            minutes: minutesSinceMidnight(at),
          };
        })
      : [];

  const activityBlocks: ActivityBlock[] = sortedActivities.map(
    (activity, index) => {
      const startAt = new Date(activity.startTime);
      const endAt = new Date(activity.endTime);
      const durationMinutes = Math.max(
        15,
        (endAt.getTime() - startAt.getTime()) / 60000,
      );
      const nestedPrayers = allPrayers.filter(
        (prayer) => startAt <= prayer.at && prayer.at <= endAt,
      );

      return {
        activity,
        activityIndex: index + 1,
        startAt,
        endAt,
        startMinutes: minutesSinceMidnight(startAt),
        durationMinutes,
        nestedPrayers,
      };
    },
  );

  const nestedNames = new Set(
    activityBlocks.flatMap((block) =>
      block.nestedPrayers.map((prayer) => prayer.name),
    ),
  );

  const standalonePrayers: StandalonePrayerBlock[] = allPrayers
    .filter((prayer) => !nestedNames.has(prayer.name))
    .map((prayer) => ({
      name: prayer.name,
      time: prayer.time,
      minutes: prayer.minutes,
    }));

  const timelinePoints = [
    ...activityBlocks.flatMap((block) => [
      block.startMinutes,
      block.startMinutes + block.durationMinutes,
    ]),
    ...standalonePrayers.map((prayer) => prayer.minutes),
  ];

  const defaultStart = 5 * 60;
  const defaultEnd = 22 * 60;
  const rangeStartMinutes =
    timelinePoints.length > 0
      ? Math.max(0, Math.min(...timelinePoints, defaultStart) - TIMELINE_PADDING_MINUTES)
      : defaultStart;
  const rangeEndMinutes =
    timelinePoints.length > 0
      ? Math.min(
          24 * 60,
          Math.max(...timelinePoints, defaultEnd) + TIMELINE_PADDING_MINUTES,
        )
      : defaultEnd;

  return {
    rangeStartMinutes,
    rangeEndMinutes,
    totalMinutes: Math.max(60, rangeEndMinutes - rangeStartMinutes),
    activities: activityBlocks,
    standalonePrayers,
  };
}

function topPx(minutes: number, rangeStartMinutes: number) {
  return (minutes - rangeStartMinutes) * PX_PER_MINUTE;
}

function heightPx(durationMinutes: number) {
  return Math.max(durationMinutes * PX_PER_MINUTE, MIN_ACTIVITY_HEIGHT_PX);
}

function travelConnectorStyle(
  previousEndMinutes: number,
  nextStartMinutes: number,
  rangeStartMinutes: number,
) {
  const gapMinutes = nextStartMinutes - previousEndMinutes;
  const boundaryTop = topPx(previousEndMinutes, rangeStartMinutes);

  if (gapMinutes > 0) {
    return {
      top: boundaryTop + 4,
      height: Math.max(gapMinutes * PX_PER_MINUTE - 8, TRAVEL_CONNECTOR_HEIGHT_PX),
    };
  }

  return {
    top: boundaryTop - TRAVEL_CONNECTOR_HEIGHT_PX / 2,
    height: TRAVEL_CONNECTOR_HEIGHT_PX,
  };
}

function renderTravelConnectorContent(
  travelSegment: ActivityTravelTimeSegment | null | undefined,
  travelTimesLoading: boolean,
  travelTimesError: string | null,
) {
  if (travelTimesLoading) {
    return <span>Calculating travel...</span>;
  }

  if (travelSegment?.estimate) {
    return (
      <span className='flex items-center gap-1.5'>
        <Car className='h-3.5 w-3.5 shrink-0' />
        Travel to {travelSegment.toTitle}:{" "}
        <strong>{travelSegment.estimate.durationText}</strong> (
        {travelSegment.estimate.distanceText})
      </span>
    );
  }

  if (travelSegment?.error) {
    return <span>{travelSegment.error}</span>;
  }

  if (travelTimesError) {
    return <span>{travelTimesError}</span>;
  }

  return (
    <span className='flex items-center gap-1.5'>
      <Car className='h-3.5 w-3.5 shrink-0' />
      Travel time unavailable for this segment.
    </span>
  );
}

export default function PlannerStretchTimeline({
  dateKey,
  activities,
  prayerTimes,
  showPrayerTimes,
  plannerDays,
  travelTimeByFromActivity,
  travelTimesLoading,
  travelTimesError,
  movingActivityId,
  onMoveActivity,
  onDeleteActivity,
}: PlannerStretchTimelineProps) {
  const view = buildStretchTimelineView(
    dateKey,
    activities,
    prayerTimes,
    showPrayerTimes,
  );
  const canvasHeight = view.totalMinutes * PX_PER_MINUTE + 24;
  const hourMarkers: number[] = [];

  for (
    let minute = Math.ceil(view.rangeStartMinutes / 60) * 60;
    minute <= view.rangeEndMinutes;
    minute += 60
  ) {
    hourMarkers.push(minute);
  }

  const hasContent =
    view.activities.length > 0 || view.standalonePrayers.length > 0;

  if (!hasContent) return null;

  return (
    <div className='overflow-x-auto'>
      <div className='flex min-w-[320px] gap-3'>
        <div
          className='relative w-14 shrink-0 text-[11px] text-gray-400'
          style={{ height: canvasHeight }}
        >
          {hourMarkers.map((minute) => (
            <span
              key={minute}
              className='absolute right-0 -translate-y-1/2'
              style={{ top: topPx(minute, view.rangeStartMinutes) }}
            >
              {formatHourLabel(minute)}
            </span>
          ))}
        </div>

        <div
          className='relative flex-1 rounded-xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white'
          style={{ height: canvasHeight }}
        >
          {hourMarkers.map((minute) => (
            <div
              key={`grid-${minute}`}
              className='pointer-events-none absolute left-0 right-0 border-t border-dashed border-gray-200'
              style={{ top: topPx(minute, view.rangeStartMinutes) }}
            />
          ))}

          {view.standalonePrayers.map((prayer) => (
            <div
              key={`standalone-${prayer.name}`}
              className='absolute left-3 right-3 z-20'
              style={{
                top: topPx(prayer.minutes, view.rangeStartMinutes),
                height: STANDALONE_PRAYER_HEIGHT_PX,
              }}
            >
              <div className='flex h-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 shadow-sm'>
                <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white'>
                  <Moon className='h-4 w-4' />
                </div>
                <div>
                  <p className='text-sm font-semibold text-emerald-900'>
                    {prayer.name}
                  </p>
                  <p className='text-xs text-emerald-700'>{prayer.time}</p>
                </div>
              </div>
            </div>
          ))}

          {view.activities.map((block, index) => {
            const blockTop = topPx(block.startMinutes, view.rangeStartMinutes);
            const blockHeight = heightPx(block.durationMinutes);
            const previousBlock = view.activities[index - 1];
            const travelSegment = previousBlock
              ? travelTimeByFromActivity.get(previousBlock.activity.id)
              : null;
            const previousEndMinutes =
              previousBlock != null
                ? previousBlock.startMinutes + previousBlock.durationMinutes
                : null;
            const showTravel =
              previousBlock != null &&
              travelSegment?.toActivityId === block.activity.id;
            const connectorStyle =
              showTravel && previousEndMinutes != null
                ? travelConnectorStyle(
                    previousEndMinutes,
                    block.startMinutes,
                    view.rangeStartMinutes,
                  )
                : null;

            return (
              <div key={block.activity.id}>
                {showTravel && connectorStyle && (
                  <div
                    className='absolute left-3 right-3 z-30 flex items-center rounded-lg border border-dashed border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-800 shadow-sm'
                    style={connectorStyle}
                  >
                    {renderTravelConnectorContent(
                      travelSegment,
                      travelTimesLoading,
                      travelTimesError,
                    )}
                  </div>
                )}

                <div
                  className='absolute left-3 right-3 z-10 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm'
                  style={{ top: blockTop, height: blockHeight }}
                >
                  <div className='flex h-full flex-col border-l-4 border-l-blue-500 bg-blue-50/40'>
                    <div className='flex items-start justify-between gap-3 border-b border-blue-100 bg-white/90 px-3 py-2'>
                      <div className='min-w-0'>
                        <div className='flex items-center gap-2'>
                          <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white'>
                            {block.activityIndex}
                          </span>
                          <p className='truncate font-semibold text-gray-900'>
                            {block.activity.title}
                          </p>
                        </div>
                        <p className='mt-1 flex items-center gap-1 text-xs text-gray-500'>
                          <Clock className='h-3.5 w-3.5' />
                          {timeOnly(block.startAt)} - {timeOnly(block.endAt)}
                        </p>
                      </div>
                      <div className='flex shrink-0 flex-col gap-1'>
                        <select
                          value={activityDateKey(block.activity)}
                          onChange={(e) =>
                            onMoveActivity(block.activity, e.target.value)
                          }
                          disabled={movingActivityId === block.activity.id}
                          className='rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px]'
                        >
                          {plannerDays.map((day) => (
                            <option key={day.dateKey} value={day.dateKey}>
                              {day.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant='destructive'
                          size='sm'
                          className='h-7 px-2 text-[11px]'
                          onClick={() =>
                            onDeleteActivity(
                              block.activity.id,
                              block.activity.title,
                            )
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                      <div className='relative min-h-0 flex-1 px-3 py-2'>
                        {block.nestedPrayers.map((prayer) => {
                          const offsetMinutes =
                            prayer.minutes - block.startMinutes;
                          const topPercent = Math.min(
                            88,
                            Math.max(8, (offsetMinutes / block.durationMinutes) * 100),
                          );

                          return (
                            <div
                              key={`${block.activity.id}-${prayer.name}`}
                              className='absolute left-3 right-3 z-20 -translate-y-1/2'
                              style={{ top: `${topPercent}%` }}
                            >
                              <div className='flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50/95 px-2.5 py-1.5 shadow-sm backdrop-blur-sm'>
                                <Moon className='h-3.5 w-3.5 shrink-0 text-emerald-700' />
                                <span className='text-xs font-semibold text-emerald-900'>
                                  {prayer.name}
                                </span>
                                <span className='text-xs text-emerald-700'>
                                  {prayer.time}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        <div className='absolute bottom-2 left-3 right-3 z-10 space-y-1 text-xs text-gray-600'>
                          {block.activity.address ? (
                            <p className='flex items-start gap-1.5'>
                              <MapPin className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                              <span className='line-clamp-2'>
                                {block.activity.address}
                              </span>
                            </p>
                          ) : null}
                          {block.activity.latitude != null &&
                          block.activity.longitude != null ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${block.activity.latitude},${block.activity.longitude}`}
                              target='_blank'
                              rel='noreferrer'
                              className='inline-block text-blue-600 hover:underline'
                            >
                              View on Maps
                            </a>
                          ) : null}
                          {block.nestedPrayers.length > 0 && (
                            <p className='rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-800'>
                              {block.nestedPrayers.length} prayer
                              {block.nestedPrayers.length > 1 ? " times" : " time"}{" "}
                              stack inside this block.
                            </p>
                          )}
                        </div>
                      </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
