import type { ActivityTravelTimeSegment, ApiActivity } from "@/types/api";
import { clipActivityToDay } from "@/lib/planner-dates";

export interface ActivityTimeUpdate {
  activityId: string;
  title: string;
  startTime: string;
  endTime: string;
  travelMinutes: number;
}

export function getTravelMinutesBetween(
  fromActivityId: string,
  toActivityId: string,
  segments: ActivityTravelTimeSegment[],
): number | null {
  const segment = segments.find(
    (item) =>
      item.fromActivityId === fromActivityId &&
      item.toActivityId === toActivityId,
  );

  if (!segment?.estimate) return null;
  return Math.max(1, Math.ceil(segment.estimate.durationSeconds / 60));
}

export function computeTravelAdjustedSchedule(
  dayActivities: ApiActivity[],
  travelSegments: ActivityTravelTimeSegment[],
): ActivityTimeUpdate[] {
  if (dayActivities.length < 2) return [];

  const sorted = [...dayActivities].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );

  const updates: ActivityTimeUpdate[] = [];
  let previousEnd = new Date(sorted[0].endTime);

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    const travelMinutes =
      getTravelMinutesBetween(previous.id, current.id, travelSegments) ?? 0;
    const durationMs =
      new Date(current.endTime).getTime() -
      new Date(current.startTime).getTime();
    const currentStart = new Date(current.startTime);
    const requiredStart = new Date(
      previousEnd.getTime() + travelMinutes * 60 * 1000,
    );

    // Keep intentional free time when the gap already fits travel.
    if (currentStart.getTime() >= requiredStart.getTime()) {
      previousEnd = new Date(current.endTime);
      continue;
    }

    const newStart = requiredStart;
    const newEnd = new Date(newStart.getTime() + durationMs);

    updates.push({
      activityId: current.id,
      title: current.title,
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
      travelMinutes,
    });

    previousEnd = newEnd;
  }

  return updates;
}

export function computeScheduleForOrderedActivities(
  orderedActivities: ApiActivity[],
  travelSegments: ActivityTravelTimeSegment[],
  dateKey: string,
): ActivityTimeUpdate[] {
  if (orderedActivities.length === 0) return [];

  const anchorStart: Date = orderedActivities.reduce((earliest, activity) => {
    const start = clipActivityToDay(activity, dateKey).startAt;
    return start < earliest ? start : earliest;
  }, clipActivityToDay(orderedActivities[0], dateKey).startAt);

  const updates: ActivityTimeUpdate[] = [];
  let previousEnd: Date | null = null;

  for (let index = 0; index < orderedActivities.length; index += 1) {
    const current = orderedActivities[index];
    const durationMs =
      new Date(current.endTime).getTime() -
      new Date(current.startTime).getTime();
    const travelMinutes =
      index === 0
        ? 0
        : getTravelMinutesBetween(
            orderedActivities[index - 1].id,
            current.id,
            travelSegments,
          ) ?? 15;
    const newStart: Date =
      index === 0
        ? anchorStart
        : new Date(previousEnd!.getTime() + travelMinutes * 60 * 1000);
    const newEnd = new Date(newStart.getTime() + durationMs);

    const startChanged =
      Math.abs(newStart.getTime() - new Date(current.startTime).getTime()) >=
      60_000;
    const endChanged =
      Math.abs(newEnd.getTime() - new Date(current.endTime).getTime()) >= 60_000;

    if (startChanged || endChanged) {
      updates.push({
        activityId: current.id,
        title: current.title,
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        travelMinutes,
      });
    }

    previousEnd = newEnd;
  }

  return updates;
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function getTravelBufferAfterActivity(
  activity: ApiActivity,
  nextActivityId: string | null,
  travelSegments: ActivityTravelTimeSegment[],
) {
  if (!nextActivityId) return 0;
  return getTravelMinutesBetween(activity.id, nextActivityId, travelSegments) ?? 0;
}
