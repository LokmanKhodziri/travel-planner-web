"use client";

import type {
  ActivityTravelTimeSegment,
  ApiActivity,
  PrayerTimings,
} from "@/types/api";
import { Button } from "./ui/button";
import { Car, Clock, MapPin, Moon } from "lucide-react";

const PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
const PX_PER_MINUTE = 2.1;
const MIN_ACTIVITY_HEIGHT_PX = 76;
const MIN_IN_GAP_TRAVEL_PX = 52;
const TIMELINE_PADDING_MINUTES = 30;

interface PlannerDay {
  dateKey: string;
  label: string;
  shortDate: string;
}

interface PrayerMarker {
  name: (typeof PRAYER_ORDER)[number];
  time: string;
  minutes: number;
}

interface ActivityBlock {
  activity: ApiActivity;
  activityIndex: number;
  startAt: Date;
  endAt: Date;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
}

interface StretchTimelineView {
  rangeStartMinutes: number;
  rangeEndMinutes: number;
  totalMinutes: number;
  activities: ActivityBlock[];
  prayers: PrayerMarker[];
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

  const prayers: PrayerMarker[] =
    includePrayers && prayerTimes
      ? PRAYER_ORDER.map((name) => {
          const at = parsePrayerDateTime(dateKey, prayerTimes.timings[name]);
          return {
            name,
            time: prayerTimes.timings[name],
            minutes: minutesSinceMidnight(at),
          };
        })
      : [];

  const activityBlocks: ActivityBlock[] = sortedActivities.map(
    (activity, index) => {
      const startAt = new Date(activity.startTime);
      const endAt = new Date(activity.endTime);
      const startMinutes = minutesSinceMidnight(startAt);
      const endMinutes = minutesSinceMidnight(endAt);
      const durationMinutes = Math.max(15, endMinutes - startMinutes);

      return {
        activity,
        activityIndex: index + 1,
        startAt,
        endAt,
        startMinutes,
        endMinutes,
        durationMinutes,
      };
    },
  );

  const timelinePoints = [
    ...activityBlocks.flatMap((block) => [block.startMinutes, block.endMinutes]),
    ...prayers.map((prayer) => prayer.minutes),
  ];

  const defaultStart = 5 * 60;
  const defaultEnd = 22 * 60;
  const rangeStartMinutes =
    timelinePoints.length > 0
      ? Math.max(
          0,
          Math.min(...timelinePoints, defaultStart) - TIMELINE_PADDING_MINUTES,
        )
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
    prayers,
  };
}

function topPx(minutes: number, rangeStartMinutes: number) {
  return (minutes - rangeStartMinutes) * PX_PER_MINUTE;
}

function heightPx(durationMinutes: number) {
  return Math.max(durationMinutes * PX_PER_MINUTE, MIN_ACTIVITY_HEIGHT_PX);
}

function renderTravelContent(
  travelSegment: ActivityTravelTimeSegment | null | undefined,
  travelTimesLoading: boolean,
  travelTimesError: string | null,
  fromTitle?: string,
  variant: "banner" | "gap" = "gap",
) {
  const textClass =
    variant === "banner" ? "text-sm font-medium" : "text-xs font-semibold";

  if (travelTimesLoading) {
    return (
      <span className={textClass}>Calculating drive time...</span>
    );
  }

  if (travelSegment?.estimate) {
    return (
      <>
        <Car className={variant === "banner" ? "h-4 w-4 shrink-0" : "h-3.5 w-3.5 shrink-0"} />
        <span className={textClass}>
          {fromTitle ? (
            <>
              From <strong>{fromTitle}</strong>
              {" · "}
            </>
          ) : null}
          Drive <strong>{travelSegment.estimate.durationText}</strong>
          {" · "}
          {travelSegment.estimate.distanceText}
          {variant === "gap" ? (
            <>
              {" "}
              to <strong>{travelSegment.toTitle}</strong>
            </>
          ) : null}
        </span>
      </>
    );
  }

  if (travelSegment?.error) {
    return <span className={textClass}>{travelSegment.error}</span>;
  }

  if (travelTimesError) {
    return <span className={textClass}>{travelTimesError}</span>;
  }

  return <span className={textClass}>Drive time unavailable</span>;
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
  const canvasHeight = view.totalMinutes * PX_PER_MINUTE + 32;
  const hourMarkers: number[] = [];

  for (
    let minute = Math.ceil(view.rangeStartMinutes / 60) * 60;
    minute <= view.rangeEndMinutes;
    minute += 60
  ) {
    hourMarkers.push(minute);
  }

  if (view.activities.length === 0 && view.prayers.length === 0) return null;

  return (
    <div className='overflow-x-auto rounded-xl border border-gray-200 bg-white'>
      <div
        className='grid min-w-[680px]'
        style={{
          gridTemplateColumns: showPrayerTimes
            ? "56px minmax(0, 1fr) 92px"
            : "56px minmax(0, 1fr)",
        }}
      >
        <div className='relative border-r border-gray-100 bg-gray-50/80'>
          <div className='relative' style={{ height: canvasHeight }}>
            {hourMarkers.map((minute) => (
              <span
                key={minute}
                className='absolute right-2 -translate-y-1/2 text-[11px] font-medium text-gray-400'
                style={{ top: topPx(minute, view.rangeStartMinutes) }}
              >
                {formatHourLabel(minute)}
              </span>
            ))}
          </div>
        </div>

        <div className='relative bg-slate-50/40'>
          <div className='relative' style={{ height: canvasHeight }}>
            {hourMarkers.map((minute) => (
              <div
                key={`grid-${minute}`}
                className='pointer-events-none absolute left-0 right-0 border-t border-dashed border-gray-200/80'
                style={{ top: topPx(minute, view.rangeStartMinutes) }}
              />
            ))}

            {view.activities.map((block, index) => {
              const previousBlock = view.activities[index - 1];
              const travelSegment = previousBlock
                ? travelTimeByFromActivity.get(previousBlock.activity.id)
                : null;
              const showTravel =
                previousBlock != null &&
                travelSegment?.toActivityId === block.activity.id;

              const gapTopPx =
                previousBlock != null
                  ? topPx(previousBlock.endMinutes, view.rangeStartMinutes)
                  : null;
              const gapBottomPx = topPx(block.startMinutes, view.rangeStartMinutes);
              const gapHeightPx =
                gapTopPx != null ? gapBottomPx - gapTopPx : 0;
              const showInGapTravel =
                showTravel &&
                gapTopPx != null &&
                gapHeightPx >= MIN_IN_GAP_TRAVEL_PX;
              const inGapHeight = Math.max(0, gapHeightPx - 6);

              const blockTop = gapBottomPx;
              const blockHeight = heightPx(block.durationMinutes);

              return (
                <div key={block.activity.id}>
                  {showInGapTravel && gapTopPx != null && (
                    <div
                      className='absolute left-4 right-4 z-[5] flex items-center justify-center gap-2 rounded-lg border-2 border-blue-400 bg-blue-500 px-3 py-2 text-center text-white shadow-sm'
                      style={{
                        top: gapTopPx + 3,
                        height: inGapHeight,
                      }}
                    >
                      {renderTravelContent(
                        travelSegment,
                        travelTimesLoading,
                        travelTimesError,
                        previousBlock?.activity.title,
                        "gap",
                      )}
                    </div>
                  )}

                  <article
                    className='absolute left-4 right-4 z-10 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-md'
                    style={{ top: blockTop, height: blockHeight }}
                  >
                    <div className='flex h-full flex-col border-l-4 border-l-blue-500'>
                      {showTravel && !showInGapTravel && (
                        <div className='flex items-center gap-2 border-b border-blue-400 bg-blue-600 px-3 py-2.5 text-white'>
                          {renderTravelContent(
                            travelSegment,
                            travelTimesLoading,
                            travelTimesError,
                            previousBlock?.activity.title,
                            "banner",
                          )}
                        </div>
                      )}
                      <div className='flex items-start justify-between gap-3 border-b border-gray-100 px-3 py-2.5'>
                        <div className='min-w-0'>
                          <div className='flex items-center gap-2'>
                            <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white'>
                              {block.activityIndex}
                            </span>
                            <h4 className='truncate text-sm font-semibold text-gray-900'>
                              {block.activity.title}
                            </h4>
                          </div>
                          <p className='mt-1 flex items-center gap-1 text-xs text-gray-500'>
                            <Clock className='h-3.5 w-3.5' />
                            {timeOnly(block.startAt)} – {timeOnly(block.endAt)}
                          </p>
                        </div>
                        <div className='flex shrink-0 flex-col gap-1.5'>
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

                      <div className='space-y-1 px-3 py-2 text-xs text-gray-600'>
                        {block.activity.address ? (
                          <p className='flex items-start gap-1.5'>
                            <MapPin className='mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400' />
                            <span className='line-clamp-1'>
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
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </div>

        {showPrayerTimes && (
          <div className='relative border-l border-emerald-100 bg-emerald-50/30'>
            <div className='sticky top-0 z-20 border-b border-emerald-100 bg-emerald-50 px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-emerald-800'>
              Salah
            </div>
            <div className='relative' style={{ height: canvasHeight }}>
              {view.prayers.map((prayer) => (
                <div
                  key={prayer.name}
                  className='absolute left-1 right-1 z-10 -translate-y-1/2'
                  style={{
                    top: topPx(prayer.minutes, view.rangeStartMinutes),
                  }}
                >
                  <div className='rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-center shadow-sm'>
                    <div className='mx-auto mb-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white'>
                      <Moon className='h-3 w-3' />
                    </div>
                    <p className='text-[10px] font-semibold text-emerald-900'>
                      {prayer.name}
                    </p>
                    <p className='text-[10px] text-emerald-700'>{prayer.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className='flex flex-wrap gap-4 border-t border-gray-100 bg-gray-50 px-4 py-2 text-[11px] text-gray-500'>
        <span className='flex items-center gap-1.5'>
          <span className='h-3 w-5 rounded border-2 border-blue-400 bg-blue-500' />
          Drive gap (wide) or blue banner on card (narrow)
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='h-3 w-3 rounded border border-blue-300 bg-white' />
          Activity
        </span>
        {showPrayerTimes && (
          <span className='flex items-center gap-1.5'>
            <span className='h-3 w-3 rounded border border-emerald-300 bg-emerald-50' />
            Prayer time (side column)
          </span>
        )}
      </div>
    </div>
  );
}
