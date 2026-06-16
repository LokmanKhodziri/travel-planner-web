import { localDateKey } from "./trip-dates";

export function plannerDateKey(date: Date) {
  return localDateKey(date);
}

export function dayStart(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function dayEndExclusive(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day + 1, 0, 0, 0, 0);
}

export function activityPrimaryDateKey(activity: { startTime: string }) {
  return plannerDateKey(new Date(activity.startTime));
}

export function activityOverlapsDate(
  activity: { startTime: string; endTime: string },
  dateKey: string,
) {
  const rangeStart = dayStart(dateKey);
  const rangeEnd = dayEndExclusive(dateKey);
  const activityStart = new Date(activity.startTime);
  const activityEnd = new Date(activity.endTime);
  return activityStart < rangeEnd && activityEnd > rangeStart;
}

export function clipActivityToDay(
  activity: { startTime: string; endTime: string },
  dateKey: string,
) {
  const rangeStart = dayStart(dateKey);
  const rangeEnd = dayEndExclusive(dateKey);
  const fullStartAt = new Date(activity.startTime);
  const fullEndAt = new Date(activity.endTime);
  const startAt =
    fullStartAt < rangeStart ? rangeStart : fullStartAt;
  const endAt = fullEndAt > rangeEnd ? new Date(rangeEnd.getTime() - 1) : fullEndAt;

  return {
    startAt,
    endAt,
    fullStartAt,
    fullEndAt,
    continuesFromPreviousDay: fullStartAt < rangeStart,
    continuesToNextDay: fullEndAt > rangeEnd,
  };
}

export function getActivitiesOverlappingDate<
  T extends { startTime: string; endTime: string },
>(activities: T[], dateKey: string): T[] {
  return activities
    .filter((activity) => activityOverlapsDate(activity, dateKey))
    .sort((left, right) => {
      const leftStart = clipActivityToDay(left, dateKey).startAt.getTime();
      const rightStart = clipActivityToDay(right, dateKey).startAt.getTime();
      return leftStart - rightStart;
    });
}
