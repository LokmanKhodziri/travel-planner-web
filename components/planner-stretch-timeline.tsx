"use client";

import type {
  ActivityTravelTimeSegment,
  ApiActivity,
  PrayerTimings,
} from "@/types/api";
import { Button } from "./ui/button";
import { Bus, Car, Clock, Footprints, GripVertical, MapPin, Pencil } from "lucide-react";
import type { TravelMode } from "@/types/api";
import { useMediaQuery } from "@/lib/use-media-query";
import { formatTravelEstimateLabel } from "@/lib/travel-modes";
import { activityPrimaryDateKey, clipActivityToDay } from "@/lib/planner-dates";
import ActivityNearbyMosques from "./activity-nearby-mosques";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
const GAP_COMPRESS_THRESHOLD_MIN = 60;

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
  fullStartAt: Date;
  fullEndAt: Date;
  continuesFromPreviousDay: boolean;
  continuesToNextDay: boolean;
  startMinutes: number;
  endMinutes: number;
}

interface FreeTimeItem {
  type: "free";
  startMinute: number;
  endMinute: number;
}

interface ActivityItem {
  type: "activity";
  block: ActivityBlock;
  travelSegment: ActivityTravelTimeSegment | null;
  showTravel: boolean;
}

type TimelineItem = FreeTimeItem | ActivityItem;

interface StretchTimelineView {
  items: TimelineItem[];
  prayers: PrayerMarker[];
}

interface PlannerStretchTimelineProps {
  tripId: string;
  dateKey: string;
  activities: ApiActivity[];
  prayerTimes: PrayerTimings | null;
  showPrayerTimes: boolean;
  plannerDays: PlannerDay[];
  travelTimeByFromActivity: Map<string, ActivityTravelTimeSegment>;
  travelTimesLoading: boolean;
  travelTimesError: string | null;
  movingActivityId: string | null;
  reorderingActivities: boolean;
  onMoveActivity: (activity: ApiActivity, dateKey: string) => void;
  onDeleteActivity: (activityId: string, activityTitle: string) => void;
  onEditActivity: (activity: ApiActivity) => void;
  onReorderActivities: (orderedActivityIds: string[]) => void;
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

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

function findPreviousActivityBlock(
  items: TimelineItem[],
  index: number,
): ActivityBlock | undefined {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const item = items[cursor];
    if (item.type === "activity") return item.block;
  }
  return undefined;
}

function getItemTimeWindow(item: TimelineItem) {
  if (item.type === "free") {
    return { startMinute: item.startMinute, endMinute: item.endMinute };
  }
  return {
    startMinute: item.block.startMinutes,
    endMinute: item.block.endMinutes,
  };
}

function assignPrayersToItems(
  items: TimelineItem[],
  prayers: PrayerMarker[],
): Map<number, PrayerMarker[]> {
  const assignments = new Map<number, PrayerMarker[]>();

  for (const prayer of prayers) {
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < items.length; index += 1) {
      const { startMinute, endMinute } = getItemTimeWindow(items[index]);

      if (prayer.minutes >= startMinute && prayer.minutes < endMinute) {
        bestIndex = index;
        bestDistance = 0;
        break;
      }

      const distance =
        prayer.minutes < startMinute
          ? startMinute - prayer.minutes
          : prayer.minutes - endMinute;

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }

    if (bestIndex < 0) continue;

    const rowPrayers = assignments.get(bestIndex) ?? [];
    rowPrayers.push(prayer);
    assignments.set(bestIndex, rowPrayers);
  }

  for (const [index, rowPrayers] of assignments) {
    assignments.set(
      index,
      rowPrayers.sort((a, b) => a.minutes - b.minutes),
    );
  }

  return assignments;
}

function PrayerCell({ prayers }: { prayers: PrayerMarker[] }) {
  if (prayers.length === 0) {
    return <div className='min-h-[1rem]' />;
  }

  return (
    <div className='space-y-1.5'>
      {prayers.map((prayer) => (
        <div
          key={prayer.name}
          className='rounded-md border border-emerald-100 bg-emerald-50/70 px-2 py-1.5 text-center'
        >
          <p className='text-[10px] font-semibold text-emerald-900'>
            {prayer.name}
          </p>
          <p className='text-[10px] text-emerald-700'>{prayer.time}</p>
        </div>
      ))}
    </div>
  );
}

function buildTimelineItems(
  activityBlocks: ActivityBlock[],
  travelTimeByFromActivity: Map<string, ActivityTravelTimeSegment>,
  prayers: PrayerMarker[],
): TimelineItem[] {
  if (activityBlocks.length === 0) return [];

  const items: TimelineItem[] = [];
  const firstBlock = activityBlocks[0];
  const prayersBeforeFirst = prayers.filter(
    (prayer) => prayer.minutes < firstBlock.startMinutes,
  );

  if (prayersBeforeFirst.length > 0) {
    const freeStart = Math.min(...prayersBeforeFirst.map((p) => p.minutes));
    const freeEnd = firstBlock.startMinutes;
    if (freeEnd - freeStart >= GAP_COMPRESS_THRESHOLD_MIN) {
      items.push({
        type: "free",
        startMinute: freeStart,
        endMinute: freeEnd,
      });
    }
  }

  for (let index = 0; index < activityBlocks.length; index += 1) {
    const block = activityBlocks[index];
    const previousBlock = activityBlocks[index - 1];

    if (previousBlock) {
      const idleMinutes = block.startMinutes - previousBlock.endMinutes;
      if (idleMinutes >= GAP_COMPRESS_THRESHOLD_MIN) {
        items.push({
          type: "free",
          startMinute: previousBlock.endMinutes,
          endMinute: block.startMinutes,
        });
      }
    }

    const travelSegment = previousBlock
      ? (travelTimeByFromActivity.get(previousBlock.activity.id) ?? null)
      : null;
    const showTravel =
      previousBlock != null &&
      travelSegment?.toActivityId === block.activity.id;

    items.push({
      type: "activity",
      block,
      travelSegment,
      showTravel,
    });
  }

  return items;
}

function buildStretchTimelineView(
  dateKey: string,
  dayActivities: ApiActivity[],
  prayerTimes: PrayerTimings | null,
  includePrayers: boolean,
  travelTimeByFromActivity: Map<string, ActivityTravelTimeSegment>,
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
      const clipped = clipActivityToDay(activity, dateKey);
      return {
        activity,
        activityIndex: index + 1,
        startAt: clipped.startAt,
        endAt: clipped.endAt,
        fullStartAt: clipped.fullStartAt,
        fullEndAt: clipped.fullEndAt,
        continuesFromPreviousDay: clipped.continuesFromPreviousDay,
        continuesToNextDay: clipped.continuesToNextDay,
        startMinutes: minutesSinceMidnight(clipped.startAt),
        endMinutes: minutesSinceMidnight(clipped.endAt),
      };
    },
  );

  return {
    items: buildTimelineItems(
      activityBlocks,
      travelTimeByFromActivity,
      prayers,
    ),
    prayers,
  };
}

function travelModeIcon(mode: TravelMode) {
  switch (mode) {
    case "walking":
      return Footprints;
    case "transit":
      return Bus;
    default:
      return Car;
  }
}

function renderTravelContent(
  travelSegment: ActivityTravelTimeSegment | null | undefined,
  travelTimesLoading: boolean,
  travelTimesError: string | null,
  fromTitle?: string,
) {
  if (travelTimesLoading) {
    return <span className='text-xs font-medium'>Calculating travel...</span>;
  }

  if (travelSegment?.estimate) {
    const Icon = travelModeIcon(travelSegment.estimate.mode ?? "driving");
    return (
      <>
        <Icon className='h-3.5 w-3.5 shrink-0' />
        <span className='min-w-0 text-xs font-medium break-words'>
          {fromTitle ? <>From {fromTitle} · </> : null}
          {formatTravelEstimateLabel(travelSegment.estimate)}
        </span>
      </>
    );
  }

  if (travelSegment?.error) {
    return <span className='text-xs font-medium'>{travelSegment.error}</span>;
  }

  if (travelTimesError) {
    return <span className='text-xs font-medium'>{travelTimesError}</span>;
  }

  return <span className='text-xs font-medium'>Travel time unavailable</span>;
}

interface SortableTimelineActivityRowProps {
  item: ActivityItem;
  itemIndex: number;
  items: TimelineItem[];
  gridColumns: string;
  showPrayerTimes: boolean;
  compact: boolean;
  prayers: PrayerMarker[];
  plannerDays: PlannerDay[];
  tripId: string;
  travelTimesLoading: boolean;
  travelTimesError: string | null;
  movingActivityId: string | null;
  reorderingActivities: boolean;
  onMoveActivity: (activity: ApiActivity, dateKey: string) => void;
  onDeleteActivity: (activityId: string, activityTitle: string) => void;
  onEditActivity: (activity: ApiActivity) => void;
}

function SortableTimelineActivityRow({
  item,
  itemIndex,
  items,
  gridColumns,
  showPrayerTimes,
  compact,
  prayers,
  plannerDays,
  tripId,
  travelTimesLoading,
  travelTimesError,
  movingActivityId,
  reorderingActivities,
  onMoveActivity,
  onDeleteActivity,
  onEditActivity,
}: SortableTimelineActivityRowProps) {
  const { block, travelSegment, showTravel } = item;
  const previousActivity = findPreviousActivityBlock(items, itemIndex);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.activity.id });

  return (
    <div
      ref={setNodeRef}
      className='grid items-start gap-x-3 px-3 py-3'
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.65 : 1,
        gridTemplateColumns: gridColumns,
      }}
    >
      <div className='pt-3 text-right'>
        <span className='text-[11px] font-semibold text-gray-600'>
          {timeOnly(block.startAt)}
        </span>
        <p className='mt-0.5 text-[10px] text-gray-400'>
          {timeOnly(block.endAt)}
        </p>
      </div>

      <article className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
        <div className='border-l-4 border-l-blue-500'>
          {showTravel && (
            <div className='flex min-w-0 flex-wrap items-center gap-1.5 border-b border-blue-100 bg-blue-50 px-3 py-1.5 text-blue-800'>
              {renderTravelContent(
                travelSegment,
                travelTimesLoading,
                travelTimesError,
                previousActivity?.activity.title,
              )}
            </div>
          )}
          <div
            className={
              compact
                ? "flex flex-col gap-3 px-3 py-2.5"
                : "flex items-start justify-between gap-3 px-3 py-2.5"
            }
          >
            <div className='flex min-w-0 flex-1 items-start gap-2'>
              <button
                type='button'
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                disabled={reorderingActivities || movingActivityId != null}
                className='mt-0.5 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40'
                title='Drag to reorder'
                aria-label={`Drag ${block.activity.title}`}
              >
                <GripVertical className='h-4 w-4' />
              </button>
              <div className='min-w-0 flex-1'>
                <div className='flex items-start gap-2'>
                  <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white'>
                    {block.activityIndex}
                  </span>
                  <h4 className='min-w-0 text-sm font-semibold leading-snug break-words text-gray-900'>
                    {block.activity.title}
                  </h4>
                </div>
                <p className='mt-1 flex items-center gap-1 text-xs text-gray-500'>
                  <Clock className='h-3.5 w-3.5 shrink-0' />
                  {timeOnly(block.fullStartAt)} – {timeOnly(block.fullEndAt)}
                </p>
                {(block.continuesFromPreviousDay ||
                  block.continuesToNextDay) && (
                  <p className='mt-1 text-[11px] font-medium text-amber-700'>
                    {block.continuesFromPreviousDay && block.continuesToNextDay
                      ? "Spans overnight"
                      : block.continuesFromPreviousDay
                        ? "Continued from previous day"
                        : "Continues into next day"}
                  </p>
                )}
              </div>
            </div>
            <div
              className={
                compact
                  ? "flex w-full flex-wrap items-center gap-2 border-t border-gray-100 pt-2"
                  : "flex shrink-0 flex-col gap-1.5"
              }
            >
              <select
                value={activityPrimaryDateKey(block.activity)}
                onChange={(e) =>
                  onMoveActivity(block.activity, e.target.value)
                }
                disabled={
                  movingActivityId === block.activity.id || reorderingActivities
                }
                className='min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs sm:text-[11px]'
              >
                {plannerDays.map((day) => (
                  <option key={day.dateKey} value={day.dateKey}>
                    {day.label}
                  </option>
                ))}
              </select>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-8 flex-1 px-2 text-xs sm:h-7 sm:flex-none sm:text-[11px]'
                disabled={reorderingActivities}
                onClick={() => onEditActivity(block.activity)}
              >
                <Pencil className='h-3 w-3' />
                Edit
              </Button>
              <Button
                variant='destructive'
                size='sm'
                className='h-8 flex-1 px-2 text-xs sm:h-7 sm:flex-none sm:text-[11px]'
                disabled={reorderingActivities}
                onClick={() =>
                  onDeleteActivity(block.activity.id, block.activity.title)
                }
              >
                Delete
              </Button>
            </div>
          </div>

          {(block.activity.address ||
            (block.activity.latitude != null &&
              block.activity.longitude != null)) && (
            <div className='space-y-1 border-t border-gray-100 px-3 py-2 text-xs text-gray-600'>
              {block.activity.address ? (
                <p className='flex items-start gap-1.5'>
                  <MapPin className='mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400' />
                  <span className='break-words'>{block.activity.address}</span>
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
          )}

          {compact && showPrayerTimes && (
            <div className='space-y-2 border-t border-emerald-100 bg-emerald-50/40 px-3 py-2'>
              <p className='text-[10px] font-semibold uppercase tracking-wide text-emerald-800'>
                Salah & masjid
              </p>
              <PrayerCell prayers={prayers} />
              {block.activity.latitude != null &&
                block.activity.longitude != null && (
                  <ActivityNearbyMosques
                    tripId={tripId}
                    activityTitle={block.activity.title}
                    latitude={block.activity.latitude}
                    longitude={block.activity.longitude}
                  />
                )}
            </div>
          )}
        </div>
      </article>

      {showPrayerTimes && !compact && (
        <div className='border-l border-emerald-100/80 pl-2 pt-1'>
          <PrayerCell prayers={prayers} />
          {block.activity.latitude != null &&
            block.activity.longitude != null && (
              <ActivityNearbyMosques
                tripId={tripId}
                activityTitle={block.activity.title}
                latitude={block.activity.latitude}
                longitude={block.activity.longitude}
              />
            )}
        </div>
      )}
    </div>
  );
}

export default function PlannerStretchTimeline({
  tripId,
  dateKey,
  activities,
  prayerTimes,
  showPrayerTimes,
  plannerDays,
  travelTimeByFromActivity,
  travelTimesLoading,
  travelTimesError,
  movingActivityId,
  reorderingActivities,
  onMoveActivity,
  onDeleteActivity,
  onEditActivity,
  onReorderActivities,
}: PlannerStretchTimelineProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );
  const view = buildStretchTimelineView(
    dateKey,
    activities,
    prayerTimes,
    showPrayerTimes,
    travelTimeByFromActivity,
  );

  if (view.items.length === 0 && view.prayers.length === 0) return null;

  const compact = useMediaQuery("(max-width: 1023px)");
  const showPrayerColumn = showPrayerTimes && !compact;
  const gridColumns = showPrayerColumn
    ? "48px minmax(0, 1fr) 112px"
    : "40px minmax(0, 1fr)";
  const prayersByRow =
    showPrayerTimes && view.prayers.length > 0
      ? assignPrayersToItems(view.items, view.prayers)
      : new Map<number, PrayerMarker[]>();
  const sortableActivityIds = view.items
    .filter((item): item is ActivityItem => item.type === "activity")
    .map((item) => item.block.activity.id);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || reorderingActivities) return;

    const oldIndex = sortableActivityIds.indexOf(String(active.id));
    const newIndex = sortableActivityIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    onReorderActivities(arrayMove(sortableActivityIds, oldIndex, newIndex));
  }

  return (
    <div className='max-h-[min(72vh,720px)] overflow-x-hidden overflow-y-auto rounded-xl border border-gray-200 bg-white'>
      <div
        className={
          compact ? "min-w-0" : showPrayerTimes ? "min-w-[680px]" : "min-w-[640px]"
        }
      >
        <div
          className='grid border-b border-gray-100 bg-gray-50/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500'
          style={{ gridTemplateColumns: gridColumns }}
        >
          <span className='text-right'>Time</span>
          <span>Activity</span>
          {showPrayerColumn && (
            <span className='border-l border-emerald-100 pl-2 text-center text-emerald-800'>
              Salah & masjid
            </span>
          )}
        </div>

        <p className='border-b border-gray-100 bg-gray-50/60 px-3 py-2 text-[11px] text-gray-500'>
          Drag the handle to reorder activities.
          {showPrayerColumn
            ? " Prayer times appear on the right on larger screens."
            : showPrayerTimes
              ? " Prayer times appear below each activity on smaller screens."
              : ""}
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableActivityIds}
            strategy={verticalListSortingStrategy}
          >
            <div className='divide-y divide-gray-100'>
              {view.items.map((item, index) => {
                if (item.type === "free") {
                  return (
                    <div
                      key={`free-${item.startMinute}-${item.endMinute}`}
                      className='grid items-center bg-gray-50/50 px-3 py-2.5'
                      style={{ gridTemplateColumns: gridColumns }}
                    >
                      <span className='text-right text-[11px] text-gray-400'>
                        {formatHourLabel(item.startMinute)}
                      </span>
                      <div className='flex items-center gap-2 px-1'>
                        <div className='flex-1 border-t border-dashed border-gray-300' />
                        <span className='shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-500'>
                          {formatDuration(item.endMinute - item.startMinute)} free
                        </span>
                        <div className='flex-1 border-t border-dashed border-gray-300' />
                      </div>
                      {showPrayerColumn && (
                        <div className='border-l border-emerald-100/80 pl-2'>
                          <PrayerCell prayers={prayersByRow.get(index) ?? []} />
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <SortableTimelineActivityRow
                    key={item.block.activity.id}
                    item={item}
                    itemIndex={index}
                    items={view.items}
                    gridColumns={gridColumns}
                    showPrayerTimes={showPrayerTimes}
                    compact={compact}
                    prayers={prayersByRow.get(index) ?? []}
                    plannerDays={plannerDays}
                    tripId={tripId}
                    travelTimesLoading={travelTimesLoading}
                    travelTimesError={travelTimesError}
                    movingActivityId={movingActivityId}
                    reorderingActivities={reorderingActivities}
                    onMoveActivity={onMoveActivity}
                    onDeleteActivity={onDeleteActivity}
                    onEditActivity={onEditActivity}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className='flex flex-wrap gap-4 border-t border-gray-100 bg-gray-50 px-4 py-2 text-[11px] text-gray-500'>
        <span className='flex items-center gap-1.5'>
          <span className='h-3 w-3 rounded border border-gray-300 bg-white' />
          Activity
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='h-3 w-3 rounded border border-blue-200 bg-blue-50' />
          Travel time (top of card)
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='h-3 w-5 border-t border-dashed border-gray-300' />
          Collapsed free time
        </span>
        {showPrayerTimes && (
          <span className='flex items-center gap-1.5'>
            <span className='h-3 w-3 rounded border border-emerald-300 bg-emerald-50' />
            Prayer time
          </span>
        )}
      </div>
    </div>
  );
}
